# from: https://github.com/aplbrain/seismic/blob/main/neuroaiengines/networks/ring_attractor.py
import itertools
from typing import Callable, Iterable, Mapping, Union, Tuple, Optional
import numpy as np
import torch
from neuroaiengines import __loc__

# pylint: disable=no-name-in-module
from torch import nn, tensor
from neuroaiengines.optimization.torch import TBTTModule


# pylint: disable=not-callable,no-member
class RingAttractorPytorch(TBTTModule):
    """
    Torch model for the ring attractor
    """

    def __init__(
        self,
        w: np.ndarray,
        slcs: Mapping[str, slice],
        no_ipsi_contra_split: Union[bool, Iterable[str]] = True,
        use_landmarks: bool = True,
        use_velocity: bool = True,
        initial_angle: float = 0.0,
        initial_alpha: float = 1.0,
        nonlinearity: Callable = nn.ReLU,
        bias: Union[float, Iterable[float]] = None,
        gain: Union[float, Iterable[float]] = None,
        tau: Union[float, Iterable[float]] = None,
        noise: Optional[Callable] = None,
        clamp_tau: Optional[Tuple] = None,
    ):
        """Creates a torch model

        Args:
            w (np.ndarray): Initial weight array. Weights themselves are scaled by these numbers
            slcs (Mapping[str,slice]): A mapping of neuron population names to slices of the weight matrix
            no_ipsi_contra_split (Union[bool,Iterable[str]], optional): Don't split ipsi/contralateral connections (the connections between hemispheres). Defaults to True.
            use_landmarks (bool, optional): Make the model expect landmark input. Defaults to True.
            use_velocity (bool, optional): Make the model expect velocity input. Defaults to True.
            initial_angle (float, optional): Initial angle of the model. Defaults to 0..
            initial_alpha (float, optional): Initial weight scaling factor. Defaults to 1..
            nonlinearity (Callable, optional): Nonlinearity to use. Defaults to nn.ReLU.
            bias (Union[float,Iterable[float]], optional): Initial bias. If None, will not be tuned. Defaults to None.
            gain (Union[float,Iterable[float]], optional): Initial gain. If None, will not be tuned. Positivity enforced. Defaults to None.
            tau (Union[float,Iterable[float]], optional): Initial tau. If None, will not be tuned. Positivity enforced. Defaults to None.
            noise (Optional[Callable], optional): Noise to be added to the model. Defaults to None.
            clamp_tau (Optional[Tuple], optional): Tau clamping values. If None, tau not clamped. Defaults to None.
        """
        super().__init__()
        self.N = len(w)
        self.w = w
        self.slcs = slcs
        # Creates the blocks from the weight matrix and slices
        self.w_blks, alphas = self._create_w_blks(
            w, slcs, initial_alpha, no_ipsi_contra_split
        )
        assert (
            use_landmarks or use_velocity
        ), "Must use landmarks and/or velocity as input"
        self._ulm = use_landmarks
        self._uv = use_velocity
        self._clamp_tau = clamp_tau
        # Mapping of population names to one-hot masks of the current vector
        self.neuron_masks = self._create_neuron_masks(slcs)
        # Mappings from population name to population params
        self.gain = self.create_neuron_property(gain, default=1.0, positive=True)
        self.bias = self.create_neuron_property(bias, default=0.0)
        self.tau = self.create_neuron_property(tau, default=0.02, positive=True)

        # Weight scaling factors
        self.weights = nn.ParameterDict(alphas)
        self.v_scaling = nn.Parameter(tensor(0.0))
        self.lm_scaling = nn.Parameter(tensor(0.0))

        # Masks that need to be only created when parameters are updated

        self.gain_mask = None
        self.bias_mask = None
        self.tau_mask = None

        self.alpha_masks = None
        self.update_parameterizations()

        self._initial_angle = initial_angle
        self.nonlinearity = nonlinearity()
        self.state_size = len(w)
        self.output_size = len(w[slcs["epg"]])
        self.noise = noise

        self.hem_len_pen = int(len(w[slcs["pen"]]) / 2)

    def create_neuron_property(self, prop, default, positive=False):
        """
        Makes a ParameterDictionary from a dictionary/float/None. Used to create properties for neurons, such as gain, bias and time constant.
        """
        check_positive = lambda x: torch.log(x) if positive else x

        prop_dict = {}
        for pop in self.slcs:
            if prop is None:
                pop_prop = nn.Parameter(
                    check_positive(tensor(default)), requires_grad=False
                )
            elif np.isscalar(prop):
                pop_prop = nn.Parameter(
                    check_positive(tensor(prop)), requires_grad=True
                )
            else:
                try:
                    # If defined, use value
                    pop_prop = nn.Parameter(
                        check_positive(tensor(prop[pop])), requires_grad=True
                    )
                except KeyError:
                    # Else, freeze parameter
                    pop_prop = nn.Parameter(
                        check_positive(tensor(default)), requires_grad=False
                    )
            prop_dict[pop] = pop_prop
        return nn.ParameterDict(prop_dict)

    def create_gain_bias_tau_masks(self):
        gain_mask = torch.zeros(self.N)
        bias_mask = torch.zeros(self.N)
        tau_mask = torch.zeros(self.N)
        for n, mask in self.neuron_masks.items():
            # Enforce gain positivity
            gain_mask = gain_mask + mask * torch.exp(self.gain[n])
            bias_mask = bias_mask + mask * self.bias[n]
            # Enforce tau positivity
            if self._clamp_tau:
                tau_mask = tau_mask + mask * torch.clamp(
                    torch.exp(self.tau[n]), *self._clamp_tau
                )
            else:
                tau_mask = tau_mask + mask * torch.exp(self.tau[n])
        return gain_mask, bias_mask, tau_mask

    def create_alpha_masks(self):
        w_blocks = self.w_blks
        alphas = self.weights
        slcs = self.slcs
        masks = {}
        for slc_key, _ in w_blocks.items():
            # Get the current log scaling for the weight
            alpha = alphas[slc_key]
            # Create a mask of the weight matrix
            mask = torch.zeros(self.N, self.N, dtype=torch.double)

            # Multiply the scaling value and the mask
            prepostnames = slc_key.split("_")
            pre_slc, post_slc = prepostnames[0], prepostnames[1]
            # Alpha encoded as log value to enforce positive weights
            mask[slcs[pre_slc], slcs[post_slc]] = (
                mask[slcs[pre_slc], slcs[post_slc]]
                + torch.exp(alpha) * w_blocks[slc_key]
            )
            masks[slc_key] = mask
        return masks

    def _create_neuron_masks(self, slcs):
        d = {}
        for n, slc in slcs.items():
            x = torch.zeros(self.N)
            x[slc] = 1.0
            d[n] = x
        return d

    def _create_w_blks(self, w, slcs, a, no_ipsi_contra_split):
        """
        Splits weight matrix up into defined blocks with scaling factors for each block
        w: weight matrix
        slcs: slice objects keyed by population name

        :param w_blocks:
        :param slcs:
        :param alpha_init:
        :param no_ipsi_contra_split:
        :return:

        """

        blks = {}
        alphas = {}

        if no_ipsi_contra_split is True:
            # grab all the pre_slc labels
            no_ipsi_contra_split = list(slcs.keys())
            # remove copies
            no_ipsi_contra_split = np.unique(np.array(no_ipsi_contra_split))

        for (pre_n, pre_slc), (post_n, post_slc) in itertools.product(
            slcs.items(), slcs.items()
        ):
            blk_name = f"{pre_n}_{post_n}"
            # Store blocks
            blk = w[pre_slc, post_slc]
            n_pre = int(blk.shape[0] / 2)
            n_post = int(blk.shape[1] / 2)

            # if no contra / ipsilateral split
            if (pre_slc in no_ipsi_contra_split) or (post_slc in no_ipsi_contra_split):
                if not torch.all(blk == 0.0):
                    alphas[blk_name] = nn.Parameter(tensor(np.log(a)))
                    blks[blk_name] = blk
            # if splitting
            else:
                # parse contralateral
                contra_mask = torch.zeros_like(blk)
                contra_mask[:n_pre, n_post:] = 1
                contra_mask[n_pre:, :n_post] = 1
                contra_blk = contra_mask * blk
                if not torch.all(contra_blk == 0.0):
                    alphas[blk_name + "_contra"] = nn.Parameter(tensor(np.log(a)))
                    blks[blk_name + "_contra"] = contra_blk
                # parse ipisilateral
                ipsi_mask = torch.zeros_like(blk)
                ipsi_mask[:n_pre, :n_post] = 1
                ipsi_mask[n_pre:, n_post:] = 1
                ipsi_blk = ipsi_mask * blk
                if not torch.all(contra_blk == 0.0):
                    alphas[blk_name + "_ipsi"] = nn.Parameter(tensor(np.log(a)))
                    blks[blk_name + "_ipsi"] = ipsi_blk

                # Store parameters as logs to enforce parameter positivity
        return blks, alphas

    def du_dlm(self, lm):
        """
        Calculates external current given landmarks
        """
        inp = torch.zeros(self.N)
        if lm is not None:
            inp[self.slcs["epg"]] = lm * self.lm_scaling
        return inp

    def du_dw(self, u: torch.Tensor):
        """
        Calculates internal current for all the neurons based on connections and weights
        """
        all_activity = u
        all_activity_input = torch.zeros_like(u)
        for slc_key, mask in self.alpha_masks.items():
            all_activity_input = all_activity_input + all_activity @ mask

        return all_activity_input

    def du_dv(
        self,
        v: torch.Tensor,
    ):
        """
        Calculates change in neuron activation given a velocity
        params:
        ------
        u:
            state
        v:
            velocity
        params:

        """
        slcs = self.slcs
        all_inp = torch.zeros(self.N)
        if v is None:
            return all_inp
        hem_len = self.hem_len_pen
        hemislc = slice(None, hem_len) if v > 0 else slice(hem_len, None)
        # This will probably cause things to fail since in-place operation
        all_inp[slcs["pen"]][hemislc] = torch.abs(v) * torch.exp(self.v_scaling)
        return all_inp

    def _process_inputs(self, x):
        dt = x[0]
        lm = None
        v = None
        if self._ulm and self._uv:
            lm = x[2:]
            v = x[1]
        elif self._ulm and not self._uv:
            lm = x[2:]

        elif not self._ulm and self._uv:
            v = x[1]
        else:
            raise ValueError("Something went wrong")
        return dt, v, lm

    def forward(self, x: torch.Tensor, u: torch.Tensor):
        """
        Forward pass
        params:
        -------
        x:
            input
        u:
            state

        """
        dt, v, lm = self._process_inputs(x)
        gain = self.gain_mask
        bias = self.bias_mask
        tau = self.tau_mask
        g = self.nonlinearity(gain * u + bias)
        # Current from previous state
        dudt = -u
        # Current from interconnections
        dudw = self.du_dw(g)
        # Current from landmark input
        dudlm = self.du_dlm(lm)
        # Current from velocity input
        dudv = self.du_dv(v)
        # Membrane voltage update
        u = u + (dudt + dudv + dudlm + dudw) / tau * dt
        if self.noise is not None:
            u = u + self.noise(len(u))
        a = self.nonlinearity(gain * u + bias)
        # Return target, state,
        return a[self.slcs["epg"]], u

    def update_parameterizations(self):
        (
            self.gain_mask,
            self.bias_mask,
            self.tau_mask,
        ) = self.create_gain_bias_tau_masks()
        self.alpha_masks = self.create_alpha_masks()
