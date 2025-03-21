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
        activation_function: Callable = nn.ReLU,
        
        initial_weights: np.ndarray,
        population_slices: Mapping[str, slice],
        
        bias_values: Union[float, Iterable[float]] = None,
        gain_values: Union[float, Iterable[float]] = None,
        time_constant: Union[float, Iterable[float]] = None,
    ):
        """Creates a torch model for the ring attractor network.

        Args:
            activation_function (Callable, optional): Activation_function function to use. Defaults to nn.ReLU.
            
            initial_weights (np.ndarray): Initial weight array. Weights themselves are scaled by these numbers.
            population_slices (Mapping[str,slice]): A mapping of neuron population names to slices of the weight matrix.
            
            bias_values (Union[float,Iterable[float]], optional): Initial bias values. Defaults to None.
            gain_values (Union[float,Iterable[float]], optional): Initial gain values. Defaults to None.
            time_constant (Union[float,Iterable[float]], optional): Initial time constant values. Defaults to None.
        """
        super().__init__()
        self.num_neurons = len(initial_weights)
        self.initial_weights = initial_weights
        self.population_slices = population_slices
        
        self.activation_function = activation_function()
        self.state_size = len(initial_weights)
        self.output_size = len(initial_weights[population_slices["epg"]])
        self.hemisphere_length_penalty = int(len(initial_weights[population_slices["pen"]]) / 2)
        
        # Overview of values (before init)
        if 1:
            # torch parameters
            self.landmark_scaling  # scalar
            self.scaling_factors   # parameter dict
            self.gain_for          # parameter dict
            self.bias_for          # parameter dict
            self.time_constant_for # parameter dict
            
            # other 
            self.weight_blocks # dict
            
            # Masks
            self.neuron_masks  # dict
            self.gain_mask
            self.bias_mask
            self.time_constant_mask
            self.scaling_factor_masks
        
        # 
        # self.landmark_scaling
        # 
        self.landmark_scaling = nn.Parameter(tensor(0.0))
        
        # 
        # self.weight_blocks
        # self.scaling_factors
        # 
        if 1:
            def create_weight_blocks(initial_weights, population_slices):
                """
                Splits the weight matrix into defined blocks with scaling factors for each block.
                """
                weight_blocks = {}
                scaling_factors = {}

                for (pre_population, pre_slice), (post_population, post_slice) in itertools.product(
                    population_slices.items(), population_slices.items()
                ):
                    block_name = f"{pre_population}_{post_population}"
                    # Store weight blocks
                    block = initial_weights[pre_slice, post_slice]
                    pre_neuron_count = int(block.shape[0] / 2)
                    post_neuron_count = int(block.shape[1] / 2)
                    
                    weight_scale = 1.0
                    if not torch.all(block == 0.0):
                        scaling_factors[block_name] = nn.Parameter(tensor(np.log(weight_scale)))
                        weight_blocks[block_name] = block

                return weight_blocks, nn.ParameterDict(scaling_factors)
            
            self.weight_blocks, self.scaling_factors = create_weight_blocks(initial_weights, population_slices)
        
        # 
        # self.gain_for
        # self.bias_for
        # self.time_constant_for
        # 
        if 1:
            enforce_positive = lambda x: torch.log(x) if positive else x
            def create_neuron_property(property_values, default, positive=False):
                property_dict = {}
                for population_name in population_slices:
                    if property_values is None:
                        neuron_property = nn.Parameter( enforce_positive(tensor(default)), requires_grad=False)
                    elif np.isscalar(property_values):
                        neuron_property = nn.Parameter( enforce_positive(tensor(property_values)), requires_grad=True)
                    else:
                        try:
                            # Use provided value for the population
                            neuron_property = nn.Parameter(  enforce_positive(tensor(property_values[population_name])), requires_grad=True  )
                        except KeyError:
                            # Use default value if population not found
                            neuron_property = nn.Parameter(  enforce_positive(tensor(default)), requires_grad=False  )
                    property_dict[population_name] = neuron_property
                
                return nn.ParameterDict(property_dict)
            
            self.gain_for          = create_neuron_property(gain_values, default=1.0, positive=True)
            self.bias_for          = create_neuron_property(bias_values, default=0.0)
            self.time_constant_for = create_neuron_property(time_constant, default=0.02, positive=True)

        # 
        # self.neuron_masks
        # 
        if 1:
            def create_neuron_masks(num_neurons, population_slices):
                neuron_masks = {}
                for population_name, slice_range in population_slices.items():
                    mask = torch.zeros(num_neurons)
                    mask[slice_range] = 1.0
                    neuron_masks[population_name] = mask
                return neuron_masks
            
            self.neuron_masks = create_neuron_masks(self.num_neurons, self.population_slices)
        
        #
        # self.gain_mask
        # self.bias_mask
        # self.time_constant_mask
        # 
        if 1:
            def create_gain_bias_time_constant_masks(num_neurons, neuron_masks, gain_for, bias_for, time_constant_for):
                gain_mask = torch.zeros(num_neurons)
                bias_mask = torch.zeros(num_neurons)
                time_constant_mask = torch.zeros(num_neurons)
                for population_name, mask in neuron_masks.items():
                    # Apply gain positivity constraint
                    gain_mask = gain_mask + mask * torch.exp(gain_for[population_name])
                    bias_mask = bias_mask + mask * bias_for[population_name]
                    # Apply time constant positivity constraint
                    time_constant_mask = time_constant_mask + mask * torch.exp(time_constant_for[population_name])
                return gain_mask, bias_mask, time_constant_mask
            
            self.gain_mask, self.bias_mask, self.time_constant_mask = create_gain_bias_time_constant_masks(self.num_neurons, self.neuron_masks, self.gain_for, self.bias_for, self.time_constant_for)
            
        # 
        # self.scaling_factor_masks
        # 
        if 1:
            def create_scaling_factor_masks(weight_blocks, scaling_factors, population_slices, num_neurons):
                weight_blocks = weight_blocks
                scaling_factors = scaling_factors
                population_slices = population_slices
                masks = {}
                for slice_key, _ in weight_blocks.items():
                    # Get the current scaling factor for the weight block
                    scaling_factor = scaling_factors[slice_key]
                    # Create a mask for the weight matrix
                    mask = torch.zeros(num_neurons, num_neurons, dtype=torch.double)

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
            
            self.scaling_factor_masks = create_scaling_factor_masks(self.weight_blocks, self.scaling_factors, self.population_slices, self.num_neurons)

    def forward(self, input_values: torch.Tensor, state: torch.Tensor):
        """
        Forward pass through the network.
        """
        dt = input_values[0]
        landmarks = input_values[2:] # only use landmarks
        gain = self.gain_mask
        bias = self.bias_mask
        time_constant = self.time_constant_mask
        neuron_activity = self.activation_function(gain * state + bias)
        # Current from previous state
        state_derivative = -state
        # Current from weight connections
        weighted_input = torch.zeros_like(neuron_activity)
        for slice_key, mask in self.scaling_factor_masks.items():
            weighted_input = activity_input + neuron_activity @ mask
        # Current from landmark input
        landmark_input = torch.zeros(self.num_neurons)
        landmark_input[self.population_slices["epg"]] = landmarks * self.landmark_scaling
        # Current from none_val input
        velocity_input = torch.zeros(self.num_neurons)
        # Update state with membrane voltage
        state = state + (state_derivative + velocity_input + landmark_input + weighted_input) / time_constant * dt
        output_activity = self.activation_function(gain * state + bias)
        # Return output and current state
        return output_activity[self.population_slices["epg"]], state