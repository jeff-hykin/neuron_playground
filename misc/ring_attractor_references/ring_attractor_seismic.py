# from: https://github.com/aplbrain/seismic/blob/main/neuroaiengines/networks/ring_attractor.py
import itertools
from typing import Callable, Iterable, Mapping, Union, Tuple, Optional
import numpy as np
import torch
from torch import nn, tensor


class RingAttractorNetwork(nn.Module):
    """
    Torch model for the ring attractor neural network.
    """

    def __init__(
        self,
        initial_weights: np.ndarray,
        population_slices: Mapping[str, slice],
        no_interhemispheric_split: Union[bool, Iterable[str]] = True,
        use_landmarks: bool = True,
        use_velocity: bool = True,
        initial_angle: float = 0.0,
        initial_weight_scale: float = 1.0,
        activation_function: Callable = nn.ReLU,
        bias_values: Union[float, Iterable[float]] = None,
        gain_values: Union[float, Iterable[float]] = None,
        time_constant: Union[float, Iterable[float]] = None,
        noise_function: Optional[Callable] = None,
        clamp_time_constant: Optional[Tuple] = None,
    ):
        """Creates a torch model for the ring attractor network.

        Args:
            initial_weights (np.ndarray): Initial weight array. Weights themselves are scaled by these numbers.
            population_slices (Mapping[str,slice]): A mapping of neuron population names to slices of the weight matrix.
            no_interhemispheric_split (Union[bool,Iterable[str]], optional): Don't split ipsilateral/contralateral connections (the connections between hemispheres). Defaults to True.
            use_landmarks (bool, optional): Make the model expect landmark input. Defaults to True.
            use_velocity (bool, optional): Make the model expect velocity input. Defaults to True.
            initial_angle (float, optional): Initial angle of the model. Defaults to 0.0.
            initial_weight_scale (float, optional): Initial weight scaling factor. Defaults to 1.0.
            activation_function (Callable, optional): Activation_function function to use. Defaults to nn.ReLU.
            bias_values (Union[float,Iterable[float]], optional): Initial bias values. Defaults to None.
            gain_values (Union[float,Iterable[float]], optional): Initial gain values. Defaults to None.
            time_constant (Union[float,Iterable[float]], optional): Initial time constant values. Defaults to None.
            noise_function (Optional[Callable], optional): Noise function to be added to the model. Defaults to None.
            clamp_time_constant (Optional[Tuple], optional): Time constant clamping values. Defaults to None.
        """
        super().__init__()
        self.num_neurons = len(initial_weights)
        self.initial_weights = initial_weights
        self.population_slices = population_slices
        # Create weight blocks and scaling factors
        self.weight_blocks, scaling_factors = self._create_weight_blocks(
            initial_weights, population_slices, initial_weight_scale, no_interhemispheric_split
        )
        assert (
            use_landmarks or use_velocity
        ), "Must use landmarks and/or velocity as input"
        self.use_landmarks_input = use_landmarks
        self.use_velocity_input = use_velocity
        self.clamp_time_constant = clamp_time_constant
        # Mapping of population names to one-hot masks of the current vector
        self.neuron_masks = self._create_neuron_masks(population_slices)
        # Mappings from population name to population parameters
        self.gain = self.create_neuron_property(gain_values, default=1.0, positive=True)
        self.bias = self.create_neuron_property(bias_values, default=0.0)
        self.time_constant = self.create_neuron_property(time_constant, default=0.02, positive=True)

        # Weight scaling factors
        self.scaling_factors = nn.ParameterDict(scaling_factors)
        self.velocity_scaling = nn.Parameter(tensor(0.0))
        self.landmark_scaling = nn.Parameter(tensor(0.0))

        # Masks that need to be created when parameters are updated
        self.gain_mask = None
        self.bias_mask = None
        self.time_constant_mask = None

        self.scaling_factor_masks = None
        self.update_parameterizations()

        self.initial_angle = initial_angle
        self.activation_function = activation_function()
        self.state_size = len(initial_weights)
        self.output_size = len(initial_weights[population_slices["epg"]])
        self.noise_function = noise_function

        self.hemisphere_length_penalty = int(len(initial_weights[population_slices["pen"]]) / 2)

    def create_neuron_property(self, property_values, default, positive=False):
        """
        Creates a ParameterDictionary for neuron properties like gain, bias, and time constant.
        """
        enforce_positive = lambda x: torch.log(x) if positive else x

        property_dict = {}
        for population_name in self.population_slices:
            if property_values is None:
                neuron_property = nn.Parameter(
                    enforce_positive(tensor(default)), requires_grad=False
                )
            elif np.isscalar(property_values):
                neuron_property = nn.Parameter(
                    enforce_positive(tensor(property_values)), requires_grad=True
                )
            else:
                try:
                    # Use provided value for the population
                    neuron_property = nn.Parameter(
                        enforce_positive(tensor(property_values[population_name])), requires_grad=True
                    )
                except KeyError:
                    # Use default value if population not found
                    neuron_property = nn.Parameter(
                        enforce_positive(tensor(default)), requires_grad=False
                    )
            property_dict[population_name] = neuron_property
        return nn.ParameterDict(property_dict)

    def create_gain_bias_time_constant_masks(self):
        gain_mask = torch.zeros(self.num_neurons)
        bias_mask = torch.zeros(self.num_neurons)
        time_constant_mask = torch.zeros(self.num_neurons)
        for population_name, mask in self.neuron_masks.items():
            # Apply gain positivity constraint
            gain_mask = gain_mask + mask * torch.exp(self.gain[population_name])
            bias_mask = bias_mask + mask * self.bias[population_name]
            # Apply time constant positivity constraint
            if self.clamp_time_constant:
                time_constant_mask = time_constant_mask + mask * torch.clamp(
                    torch.exp(self.time_constant[population_name]), *self.clamp_time_constant
                )
            else:
                time_constant_mask = time_constant_mask + mask * torch.exp(self.time_constant[population_name])
        return gain_mask, bias_mask, time_constant_mask

    def create_scaling_factor_masks(self):
        weight_blocks = self.weight_blocks
        scaling_factors = self.scaling_factors
        population_slices = self.population_slices
        masks = {}
        for slice_key, _ in weight_blocks.items():
            # Get the current scaling factor for the weight block
            scaling_factor = scaling_factors[slice_key]
            # Create a mask for the weight matrix
            mask = torch.zeros(self.num_neurons, self.num_neurons, dtype=torch.double)

            # Apply the scaling factor to the mask
            pre_post_names = slice_key.split("_")
            pre_slice, post_slice = pre_post_names[0], pre_post_names[1]
            # Ensure positive scaling by using logarithmic transformation
            mask[population_slices[pre_slice], population_slices[post_slice]] = (
                mask[population_slices[pre_slice], population_slices[post_slice]]
                + torch.exp(scaling_factor) * weight_blocks[slice_key]
            )
            masks[slice_key] = mask
        return masks

    def _create_neuron_masks(self, population_slices):
        neuron_masks = {}
        for population_name, slice_range in population_slices.items():
            mask = torch.zeros(self.num_neurons)
            mask[slice_range] = 1.0
            neuron_masks[population_name] = mask
        return neuron_masks

    def _create_weight_blocks(self, initial_weights, population_slices, weight_scale, no_interhemispheric_split):
        """
        Splits the weight matrix into defined blocks with scaling factors for each block.
        """
        weight_blocks = {}
        scaling_factors = {}

        if no_interhemispheric_split is True:
            # Grab all the pre-slice labels
            no_interhemispheric_split = list(population_slices.keys())
            # Remove duplicates
            no_interhemispheric_split = np.unique(np.array(no_interhemispheric_split))

        for (pre_population, pre_slice), (post_population, post_slice) in itertools.product(
            population_slices.items(), population_slices.items()
        ):
            block_name = f"{pre_population}_{post_population}"
            # Store weight blocks
            block = initial_weights[pre_slice, post_slice]
            pre_neuron_count = int(block.shape[0] / 2)
            post_neuron_count = int(block.shape[1] / 2)

            # If no interhemispheric split
            if (pre_slice in no_interhemispheric_split) or (post_slice in no_interhemispheric_split):
                if not torch.all(block == 0.0):
                    scaling_factors[block_name] = nn.Parameter(tensor(np.log(weight_scale)))
                    weight_blocks[block_name] = block
            # If splitting into hemispheres
            else:
                # Create contralateral mask
                contralateral_mask = torch.zeros_like(block)
                contralateral_mask[:pre_neuron_count, post_neuron_count:] = 1
                contralateral_mask[pre_neuron_count:, :post_neuron_count] = 1
                contralateral_block = contralateral_mask * block
                if not torch.all(contralateral_block == 0.0):
                    scaling_factors[block_name + "_contralateral"] = nn.Parameter(tensor(np.log(weight_scale)))
                    weight_blocks[block_name + "_contralateral"] = contralateral_block
                # Create ipsilateral mask
                ipsilateral_mask = torch.zeros_like(block)
                ipsilateral_mask[:pre_neuron_count, :post_neuron_count] = 1
                ipsilateral_mask[pre_neuron_count:, post_neuron_count:] = 1
                ipsilateral_block = ipsilateral_mask * block
                if not torch.all(ipsilateral_block == 0.0):
                    scaling_factors[block_name + "_ipsilateral"] = nn.Parameter(tensor(np.log(weight_scale)))
                    weight_blocks[block_name + "_ipsilateral"] = ipsilateral_block

        return weight_blocks, scaling_factors

    def calculate_landmark_input(self, landmarks):
        """
        Calculates external current based on landmark input.
        """
        input_vector = torch.zeros(self.num_neurons)
        if landmarks is not None:
            input_vector[self.population_slices["epg"]] = landmarks * self.landmark_scaling
        return input_vector

    def calculate_weighted_input(self, state: torch.Tensor):
        """
        Calculates internal current for all neurons based on state and weight connections.
        """
        all_activity = state
        activity_input = torch.zeros_like(state)
        for slice_key, mask in self.scaling_factor_masks.items():
            activity_input = activity_input + all_activity @ mask

        return activity_input

    def calculate_velocity_input(self, velocity: torch.Tensor):
        """
        Calculates change in neuron activation due to velocity input.
        """
        input_vector = torch.zeros(self.num_neurons)
        if velocity is None:
            return input_vector
        hemisphere_length = self.hemisphere_length_penalty
        hemisphere_slice = slice(None, hemisphere_length) if velocity > 0 else slice(hemisphere_length, None)
        # This might cause an issue due to in-place operation
        input_vector[self.population_slices["pen"]][hemisphere_slice] = torch.abs(velocity) * torch.exp(self.velocity_scaling)
        return input_vector

    def _process_input_values(self, input_values):
        dt = input_values[0]
        landmarks = None
        velocity = None
        if self.use_landmarks_input and self.use_velocity_input:
            landmarks = input_values[2:]
            velocity = input_values[1]
        elif self.use_landmarks_input and not self.use_velocity_input:
            landmarks = input_values[2:]

        elif not self.use_landmarks_input and self.use_velocity_input:
            velocity = input_values[1]
        else:
            raise ValueError("Invalid input configuration")
        return dt, velocity, landmarks

    def forward(self, input_values: torch.Tensor, state: torch.Tensor):
        """
        Forward pass through the network.
        """
        dt, velocity, landmarks = self._process_input_values(input_values)
        gain = self.gain_mask
        bias = self.bias_mask
        time_constant = self.time_constant_mask
        neuron_activity = self.activation_function(gain * state + bias)
        # Current from previous state
        state_derivative = -state
        # Current from weight connections
        weighted_input = self.calculate_weighted_input(neuron_activity)
        # Current from landmark input
        landmark_input = self.calculate_landmark_input(landmarks)
        # Current from velocity input
        velocity_input = self.calculate_velocity_input(velocity)
        # Update state with membrane voltage
        state = state + (state_derivative + velocity_input + landmark_input + weighted_input) / time_constant * dt
        if self.noise_function is not None:
            state = state + self.noise_function(len(state))
        output_activity = self.activation_function(gain * state + bias)
        # Return output and current state
        return output_activity[self.population_slices["epg"]], state

    def update_parameterizations(self):
        (
            self.gain_mask,
            self.bias_mask,
            self.time_constant_mask,
        ) = self.create_gain_bias_time_constant_masks()
        self.scaling_factor_masks = self.create_scaling_factor_masks()
