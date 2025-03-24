# from: https://github.com/DrugowitschLab/MultimodalHDCueIntegrationSims/blob/4ff3d8d486ed90a61128ae9f28e61b8a3ab3ef7b/ra_network.py
from cmath import e
import numpy as np
import matplotlib.pyplot as plt
from copy import deepcopy



class RingAttractorNetwork():


    """Class for the ring attractor network.
    Simulates ring-attractor network dynamics and learning rule as in [1]. Parameters 
    not corrected for different number of neurons, so changing the number of neurons 
    without changing the other parameters will lead to different qualitative properties
    in the ring attractor dynamics. 
    Learning rule has been slightly adapted, to change individual terms in learning 
    rule separately, but is mathematically equivalent.
    Parameters (Network dynamics)
    ------------------------------
    N : int
        Number of neurons
    tau : float
        Network time constant
    alpha : float
        Self-excitation parameter
    D : float
        Nearest-neighbor excitation
    beta : float
        Global inhibition parameter
    f_act: lambda-function
        Activation function
    v_rel : float
        AV conversion factor
    dt : float
        Timestep size. Should be smaller than 1/10 * tau
    Parameters can be given at initialization as a dictionary of the form
    {"parameter name" : value}
    Parameters (FF weight Learning)
    ---------------------
    gamma_Hebb : float
        Pre-factor for (inhibitory) Hebbian learning
    gamma_Hebb_2 : float
        Pre-factor for (inhibitory) Hebbian learning for 2nd cue
    gamma_postboost : float
        Pre-factor for postsynaptically-gated boost
    gamma_postboost_2 : float
        Pre-factor for postsynaptically-gated boost for 2nd cue
    gamma_decay : float
        Pre-factor for postsynaptically-gated weight decay
    gamma_decay_2 : float
        Pre-factor for postsynaptically-gated weight decay for 2nd cue
    eta : float
        Learning rate

    Attributes
    ----------
    J_odd : np array of shape (N,N)
        Odd recurrent connectivities (as computed from parameters)
    J_even : np array of shape (N,N)
        Even recurrent connectivities (as computed from parameters)
    r : np array of shape (N,)
        Current network state (after simulation).
    r_init : np array of shape (N,)
        Initial network state. Will be saved for eternity.
    r_trace : np array of shape (T/dt,N)
        Full history of network states of last simulation.
    I_trace : np array of shape (T/dt,N)
        Full history of network inputs of last simulation.
    g_trace : np array of shape (T/dt,N)
        Full history of input neuron activity of last simulation.
    N_g : int
        Number of input ring neurons used in the last simulation
    W : np array of shape (N,N_g)
        Feed-forward weight matrix. Needs to be initialized for learning simulations.
    W_trace : np array of shape (T/dt,N,N_g)
        Full history of feed-forward weight matrix of last simulation.
    dW_Hebb_trace : np array of shape (T/dt,N,N_g)
        Full history of Hebbian weight matrix changes.
    dW_postboost_trace : np array of shape (T/dt,N,N_g)
        Full history of postsynaptically-gated boost weight matrix changes.
    dW_decay_trace : np array of shape (T/dt,N,N_g)
        Full history of postsynaptically-gated weight-decay changes.

    g2_trace : np array of shape (T/dt,N)
        Full history of input neuron activity of last simulation.
    W2 : np array of shape (N,N_g)
        Feed-forward weight matrix. Needs to be initialized for learning simulations.
    W2_trace : np array of shape (T/dt,N,N_g)
        Full history of feed-forward weight matrix of last simulation.
    dW2_Hebb_trace : np array of shape (T/dt,N,N_g)
        Full history of Hebbian weight matrix changes.
    dW2_postboost_trace : np array of shape (T/dt,N,N_g)
        Full history of postsynaptically-gated boost weight matrix changes.
    dW2_decay_trace : np array of shape (T/dt,N,N_g)
        Full history of postsynaptically-gated weight-decay changes.

    References
    ----------
    [1] Kim, Sung Soo, Ann M Hermundstad, Sandro Romani, L F Abbott, and Vivek 
    Jayaraman. 2019. “Generation of Stable Heading Representations in Diverse 
    Visual Scenes.” Nature, 2018.https://doi.org/10.1038/s41586-019-1767-1.
    """
    
    def __init__(self,network_params,init='steady_state'):
        """
        Parameters
        ----------
        network_params : dict 
            Dictionary of network parameters, of form {"parameter name" : value}
        init : string or np.array of shape (N,)
            Determines initialization state of the network
            Options for strings:
            'steady-state' - network is initialized with steady-state bump after burn-in. 
                Bump will be at position 0.
            'random' - random initialization, activities between 0 and 1
            'zeros' - network initialized with all zeros
            'bumpatzero' - bump initialization at 0
        """
        
        for key, value in network_params.items():
            setattr(self, key, value)

        # set up recurrent connectivity matrices
        J_odd = np.zeros([self.N,self.N])
        J_even = np.zeros((self.N,self.N))
        for i in np.arange(self.N):
            J_odd[i,i-1] = -1/2 # local excitation
            J_odd[i,np.mod(i+1,self.N)] = 1/2
            J_even[i,i-1] = self.D # local excitation
            J_even[i,np.mod(i+1,self.N)] = self.D
        self.J_odd = J_odd
        self.J_even = J_even

        # initialize network state
        if init == 'steady_state':
            ra_init = RingAttractorNetwork(network_params,init='bumpatzero')
            ra_init.simulate(T=20,trace=False)
            self.r_init = ra_init.r.copy()
        elif init == 'random':
            self.r_init = np.random.uniform(0,1,self.N)
        elif init == 'zeros':
            self.r_init = np.zeros(self.N)
        elif init == 'bumpatzero':
            phi_0_r = np.linspace(-np.pi,np.pi-(2*np.pi)/self.N,self.N)
            A_init = np.maximum(0.01*np.cos(phi_0_r),0)
            self.r_init = A_init * (1 + np.cos( phi_0_r ))
        else:
            self.r_init = init

        self.r = self.r_init.copy()

    def reset_network(self):
        """
        Resets the network state to its initial state.
        """
        self.r = self.r_init.copy()
        return self
    
    def copy(self):
        """
        Deep-copy of instance.
        """
        copied_self = deepcopy(self)
        return copied_self


    def propagate_onestep(self,v=0,I=0):
        """
        Propages the network dynamics one time step forward.
        """
        # unpack parameters
        tau = self.tau
        alpha = self.alpha
        beta = self.beta
        f_act = self.f_act 

        # create effective recurrent connectivity
        J =  self.J_even - self.J_odd * v/self.v_rel
        r = self.r

        r_out = ( r
                - 1/tau * r * self.dt # decay
                + 1/tau * f_act(
                    alpha * r # self-excitation
                    + J @ r # even and odd recurrent connectivities
                    - beta * np.sum(r) # global inhibition
                    + I # external input
                    ) * self.dt
                )
        self.r = r_out
        return self


    def simulate(self,T,v=None,I=None,g=None,trace=True,learn=False,reset=True):
        """Full network simulation.
        Parameters
        ----------
        T : float
            Simulation time. Note that this is _not_ the number of time steps.
        v : None or float or np.array of shape (T/dt,), default=None
            Angular velocity input. Requires well-calibrated v_rel.
        I : None or float or np.array of shape (N,) or np.array of shape (T/dt,N), default=None
            Network input
        g : None or np.array of shape (T/dt,N_g), default=None
            Activity of input neuron population.
        trace : Boolean, default=True
            Indicates whether network states should be stored throughout the simulation
        learn : Boolean, default=False
            Indicates whether feedforward matrix is learned during simulation (True), or kept
            constant (False)
        reset : Boolean, default=True
            Resets the network state to the initial state.
        """

        if reset:
            self.reset_network()
        
        if v is None:
            v = np.zeros(int(T/self.dt))
        elif np.isscalar(v):
            v = v * np.ones(int(T/self.dt))
        if I is None:
            I = np.zeros(int(T/self.dt))
        elif np.isscalar(I):
            I = I * np.ones(int(T/self.dt))
        elif (np.ndim(I) == 1 and len(I) == self.N):
            I = I[np.newaxis,:] * np.ones((int(T/self.dt),self.N))
        if g is not None:
            self.N_g = g.shape[1]
            self.g_trace = g

        if trace: # keep track of network state
            self.r_trace = np.zeros([int(T/self.dt),self.N]) 
            self.r_trace[0] = self.r.copy()
            self.I_trace = np.zeros([int(T/self.dt),self.N]) 
            if g is not None:
                self.I_trace[0] = I[0] - self.W @ g[0]
            else:
                self.I_trace[0] = I[0]
            if learn:
                self.W_trace = np.zeros([int(T/self.dt),self.N,self.N_g])
                self.W_trace[0] = self.W.copy()
                self.dW_Hebb_trace = np.zeros([int(T/self.dt),self.N,self.N_g])
                self.dW_postboost_trace = np.zeros([int(T/self.dt),self.N,self.N_g])
                self.dW_decay_trace = np.zeros([int(T/self.dt),self.N,self.N_g])

        # the ACTUAL simulation
        for t in np.arange(1,int(T/self.dt)):

            if g is not None:
                I_g = - self.W @ g[t]
            else:
                I_g = 0

            # run network for one step
            self.propagate_onestep(v=v[t],I=I[t]+I_g)

            # keep memory of trace
            if trace:
                self.r_trace[t] = self.r.copy()
                if g is not None:
                    self.I_trace[t] = I[t]+I_g
                else:
                    self.I_trace[t] = I[t]

            # learn feed-forward weights
            if learn:
                dW_Hebb = - self.gamma_Hebb * np.outer(self.r,g[t])
                dW_postboost = self.gamma_postboost * np.outer( self.r, np.ones(len(g[t])) ) 
                dW_decay = - self.gamma_decay * self.W * np.outer( self.r, np.ones(len(g[t])) )
                dW = dW_Hebb + dW_postboost + dW_decay
                self.W = self.W + self.eta * np.abs( v[t] ) * dW
                # pruning step, no negative weights
                self.W[ self.W < 0 ] = 0
                if trace:
                    self.W_trace[t] = np.copy(self.W)
                    self.dW_Hebb_trace[t] = dW_Hebb
                    self.dW_postboost_trace[t] = dW_postboost
                    self.dW_decay_trace[t] = dW_decay

        return self


    def simulate_two_cues(self,T,v=None,I=None,g=None,g2=None,trace=True,learn=False,reset=True):
        """Full network simulation.
        Parameters
        ----------
        T : float
            Simulation time. Note that this is _not_ the number of time steps.
        v : None or float or np.array of shape (T/dt,), default=None
            Angular velocity input. Requires well-calibrated v_rel.
        I : None or float or np.array of shape (N,) or np.array of shape (T/dt,N), default=None
            Network input
        g : None or np.array of shape (T/dt,N_g), default=None
            Activity of input neuron population.
        trace : Boolean, default=True
            Indicates whether network states should be stored throughout the simulation
        learn : Boolean, default=False
            Indicates whether feedforward matrix is learned during simulation (True), or kept
            constant (False)
        reset : Boolean, default=True
            Resets the network state to the initial state.
        """

        if reset:
            self.reset_network()
        
        if v is None:
            v = np.zeros(int(T/self.dt))
        elif np.isscalar(v):
            v = v * np.ones(int(T/self.dt))
        if I is None:
            I = np.zeros(int(T/self.dt))
        elif np.isscalar(I):
            I = I * np.ones(int(T/self.dt))
        elif (np.ndim(I) == 1 and len(I) == self.N):
            I = I[np.newaxis,:] * np.ones((int(T/self.dt),self.N))
        if g is not None:
            self.N_g = g.shape[1]
            self.g_trace = g
        if g2 is not None:
            self.g2_trace = g2

        if trace: # keep track of network state
            self.r_trace = np.zeros([int(T/self.dt),self.N]) 
            self.r_trace[0] = self.r.copy()
            self.I_trace = np.zeros([int(T/self.dt),self.N]) 
            if g is not None:
                self.I_trace[0] = I[0] - self.W @ g[0] - self.W2 @ g2[0]
            else:
                self.I_trace[0] = I[0]
            if learn:
                self.W_trace = np.zeros([int(T/self.dt),self.N,self.N_g])
                self.W_trace[0] = self.W.copy()
                self.dW_Hebb_trace = np.zeros([int(T/self.dt),self.N,self.N_g])
                self.dW_postboost_trace = np.zeros([int(T/self.dt),self.N,self.N_g])
                self.dW_decay_trace = np.zeros([int(T/self.dt),self.N,self.N_g])

                self.W2_trace = np.zeros([int(T/self.dt),self.N,self.N_g])
                self.W2_trace[0] = self.W2.copy()
                self.dW2_Hebb_trace = np.zeros([int(T/self.dt),self.N,self.N_g])
                self.dW2_postboost_trace = np.zeros([int(T/self.dt),self.N,self.N_g])
                self.dW2_decay_trace = np.zeros([int(T/self.dt),self.N,self.N_g])

        # the ACTUAL simulation
        for t in np.arange(1,int(T/self.dt)):

            if g is not None:
                I_g = - self.W @ g[t]
            else:
                I_g = 0

            if g2 is not None:
                I_g2 = - self.W2 @ g2[t]
            else:
                I_g2 = 0

            # run network for one step
            self.propagate_onestep(v = v[t],I = I[t] + I_g + I_g2)

            # keep memory of trace
            if trace:
                self.r_trace[t] = self.r.copy()
                if g is not None and g2 is not None:
                    self.I_trace[t] = I[t] + I_g + I_g2
                else:
                    self.I_trace[t] = I[t]

            # learn feed-forward weights
            if learn:
                dW_Hebb = - self.gamma_Hebb * np.outer(self.r,g[t])
                dW_postboost = self.gamma_postboost * np.outer( self.r, np.ones(len(g[t])) ) 
                dW_decay = - self.gamma_decay * self.W * np.outer( self.r, np.ones(len(g[t])) )
                dW = dW_Hebb + dW_postboost + dW_decay
                self.W = self.W + self.eta * np.abs( v[t] ) * dW
                # pruning step, no negative weights
                self.W[ self.W < 0 ] = 0
                if trace:
                    self.W_trace[t] = np.copy(self.W)
                    self.dW_Hebb_trace[t] = dW_Hebb
                    self.dW_postboost_trace[t] = dW_postboost
                    self.dW_decay_trace[t] = dW_decay

                dW2_Hebb = - self.gamma_Hebb_2 * np.outer(self.r,g2[t])
                dW2_postboost = self.gamma_postboost_2 * np.outer(self.r, np.ones(len(g2[t]))) 
                dW2_decay = - self.gamma_decay_2 * self.W2 * np.outer(self.r, np.ones(len(g2[t])) )
                dW2 = dW2_Hebb + dW2_postboost + dW2_decay
                self.W2 = self.W2 + self.eta * np.abs(v[t]) * dW2
                # pruning step, no negative weights
                self.W2[self.W2 < 0] = 0
                if trace:
                    self.W2_trace[t] = np.copy(self.W2)
                    self.dW2_Hebb_trace[t] = dW2_Hebb
                    self.dW2_postboost_trace[t] = dW2_postboost
                    self.dW2_decay_trace[t] = dW2_decay

        return self


    def determine_features_basic(self,ydata=None,ind=None):
        """Determines height (max-min) and full width of half maximum of bump profile.
        Parameters
        ----------
        ydata : None or np.array of shape (M,), default=None
            Profile to determine bump parameters from. If None, then bump parameters are
            determined from network state r.
        ind : int, default=None
            Time index.
        Returns
        -------
        height : float
            Bump height
        width : float
            Bump width
        """
        if ydata is None and ind is None:
            ydata = self.r
        elif ydata is None and ind is not None:
            ydata = self.r_trace[ind].copy()

        N = len(ydata)
        N_interp = 1000

        # augment data by interpolation, finite # of datapoints
        xp = np.arange(N)
        x = np.linspace(0,N,N_interp)
        ydata = np.interp(x, xp, ydata)

        # determine peak position as maximum
        ind_max = np.where(ydata==np.max(ydata))[0][0]
        ind_min = np.where(ydata==np.min(ydata))[0][0]
        height = ydata[ind_max] - ydata[ind_min]

        # determine full width at half maximum
        # move peak to 0
        ydata_s = np.roll(ydata,N_interp - ind_max)
        # make FWHM points 0
        ydata_s = ydata_s - 1/2*height - ydata[ind_min]
        ind_left = np.where(ydata_s <0)[0][-1]
        ind_right = np.where(ydata_s <0)[0][0]
        width = (ind_right + N_interp - ind_left)/N_interp * 2 * np.pi

        return height, width

    def determine_bumpPosition(self,ydata=None,ind=None):
        """Determines max position bump profile (in rad).
        Parameters
        ----------
        ydata : None or np.array of shape (M,) or (T/dt,M), default=None
            Profile to determine bump position from. If None, then bump parameters are
            determined from network state r.
        ind : int, default=None
            Time index.
        Returns
        -------
        bump_pos : float or np.array of shape (T/dt,)
            Bump position in radians
        """
        if ydata is None and ind is None:
            ydata = self.r
            N = self.N
        elif ydata is None and ind is not None:
            ydata = self.r_trace[ind].copy()
            N = self.N
        else:
            N = ydata.shape[1]

        phi_0 = np.arange(-np.pi,np.pi,2*np.pi/N)
        bump_pos = phi_0[np.argmax(ydata,axis=-1)]

        return bump_pos


    def create_vM_input(self,mu,w,amplitude):
        """Creates a von-Mises shaped input profile of size (N,). Not sure why I made
        this a class method, but I guess it was easier to access the network size this
        why. Uses the function found in the code of Kim et al. 2017.
        Parameters
        ----------
        mu : float
            Peak position of profile, in rad, between [-pi,pi]
        w : float
            Width of profile, only accurate up to a certain width (~3)
        amplitude : float
            Height of profile.
        Returns
        -------
        profile : np.array of shape (N,)
            von-Mises shaped bump profile
        """

        kappa = np.log(1/2) / ( np.cos(1/2 * w) -1 ) 

        arg = np.linspace(-np.pi,np.pi-2*np.pi/self.N,self.N)
        if kappa > 5 : 
            tunedInp = np.exp(kappa*(np.cos(arg - mu) - 1) )
        else:
            tunedInp = (np.exp(kappa*(np.cos(arg - mu) + 1)) - 1) / (np.exp(2*kappa) - 1)

        profile = amplitude * tunedInp
        return profile
    
    def plot(self,T_min=0,T_max = None):
        """Plots the history of the network (if it exists) as a matrix plot.
        Parameters
        ----------
        T_min : float
            Minimum time
        T_max : None or float, default=None
            Maximum time. If None, then the maximum time is automatically the last simulation
            length.
        """

        if T_max is None:
            T_max = self.r_trace.shape[0] * self.dt
        
        ind_min = int((T_min)/self.dt)
        ind_max = int((T_max-self.dt)/self.dt)

        plt.imshow(self.r_trace[ind_min:ind_max].T,extent=[T_min,T_max,self.N,0],aspect='auto')
        plt.xlabel('Time/s')
        plt.ylabel('RA neuron #')
        plt.colorbar()






######### Some other useful helper functions


def back_to_circ(phi):
    """Wraps phi to be between -pi and pi (rad).
    Parameters
    ----------
    phi : array-like
        Angle to be wrapped.
        """
    phi = ( (phi+np.pi) % (2*np.pi) ) - np.pi
    return phi

def polar_to_cartesian(r,phi):
    """Converts polar to Cartesian coordinates
        """
    x = r * np.cos(phi)
    y = r * np.sin(phi)
    return x, y

def cartesian_to_polar(x,y):
    """Converts Cartesian to polar coordinates
        """
    r = np.sqrt( x**2 + y**2 )
    phi = np.arctan2(y,x)
    return phi,r

def robust_mean(arr, tail=0.2):
    """Computes a robust mean of each array column, discarding the highest and lowest values
    Parameters
    ---------
    arr : two-dimensional np.array
    tail : fraction of values in the top and bottom to discard
    """

    arr_sorted = np.sort(arr, axis=0)                          # sort values in each column

    idx_start = int(np.floor(tail * np.shape(arr_sorted)[0]))  # start index
    idx_stop = np.shape(arr_sorted)[0] - idx_start             # stop index

    arr_trimmed = arr_sorted[idx_start:idx_stop]               # discard potential outliers
    mean_arr_trimmed = np.mean(arr_trimmed, axis=0)            # compute mean of remaining values

    return mean_arr_trimmed

def circular_mean(phi,w=None):
    """"Computes a (weighted) circular mean of the vector of angles phi (e.g., particle positions),
    by converting angles to vectors in C^2 and perform (weighted) averaging there
    Parameters
    ---------
    phi : array-like
        Angles to take the circular average of
    w : None or array-like of shape phi.shape(), default=None
        For weighted averaging. Assumes weights are normalized to one.
    Returns:
    --------
    phi_hat : array-like
        Circular mean.
    r_hat : array-like
        Radius of circular mean.
    """
    
    x = np.cos(phi)
    y = np.sin(phi)
    X = np.average(x,weights=w)
    Y = np.average(y,weights=w)
    
    # convert average back to polar coordinates
    phi_hat = np.arctan2(Y,X)
    r_hat = np.sqrt( X**2 + Y**2 )
    
    return phi_hat, r_hat

def movmean(arr, windowsize):
    '''Computes moving average of array of values
    Parameters
    ---------
    arr : one-dimensional np.array
    windowsize : scalar
        Size of moving window in time steps
    '''
    
    arr_smooth = np.zeros(len(arr))  # initialize
    for i in range(len(arr)):
        if i <= np.floor(windowsize/2):
            arr_smooth[i] = np.average(arr[:i+int(np.floor(windowsize/2))])
        else:
            arr_smooth[i] = np.average(arr[i-int(np.ceil(windowsize/2)):i+int(np.floor(windowsize/2))])
    
    return arr_smooth

def sliding_window(arr, idx, windowsize):
    '''Extracts elements in given array within a window after given index
    Parameters
    ---------
    arr : one-dimensional np.array
    idx : int
        Index on the array that marks the beginning of the window
    windowsize : scalar
        Size of sliding window
    Returns:
    ---------
    arr_window : array with shape (windowsize,)
    '''

    '''Code for extracting elements in a given array within a window AFTER given index
    if idx > len(arr) - windowsize:
        arr_window = arr[idx:]
    else:
        arr_window = arr[idx : idx + windowsize - 1]
    '''

    '''Code for extracting elements in a given array within a window CENTERED on given index
    if idx <= np.floor(windowsize/2):
        arr_window = arr[:idx+int(np.floor(windowsize/2))]
    else:
        arr_window = arr[idx-int(np.ceil(windowsize/2)):idx+int(np.floor(windowsize/2))]
    '''

    # Code for extracting elements in a given away within a window BEFORE given index
    if idx < windowsize:
        arr_window = arr[: idx + 1]
    else:
        arr_window = arr[idx - windowsize + 1 : idx + 1]

    return arr_window

def offset_variation(phi1,phi2):
    """"Computes the offset variation between two arrays of same shape, as the circular variance
    between the points. Arrays are assumed to be angles in rad.
    Parameters
    ---------
    phi1 : array-like
        First array of angles
    phi2 : array-like pf shape phi1.shape()
        Second array of angles
    Returns:
    --------
    var : float
        Offset variation.
    """
    # compute circular average
    x = np.cos(phi1-phi2)
    y = np.sin(phi1-phi2)
    X = np.average(x)
    Y = np.average(y)
    
    # convert average back to polar coordinates
    r_hat = np.sqrt( X**2 + Y**2 )

    # compute circular variance
    var = 1 - r_hat
    
    return var

def plot_all(ra,T_min,T_max):
    dt = ra.dt
    N_g = ra.N
    N = ra.N
    r = ra.r_trace
    g = ra.g_trace
    I = ra.I_trace
    t = np.arange(0,T_max,dt)

    fig, ax = plt.subplots(3,3,figsize=(12,9))
    ind_min = int((T_min)/dt)
    ind_max = int((T_max-dt)/dt)

    # t_bar, z_bar = flt.circplot(t[ind_min:ind_max],z[ind_min:ind_max])
    # z_bar = (z_bar + np.pi)/(2*np.pi) * N_g
    pos = ax[0,0].imshow(g[ind_min:ind_max].T,aspect='auto',extent=[T_min,T_max,N_g,0],)
    # ax[0,0].plot(t_bar,z_bar,'r')
    ax[0,0].set_title('Input image (g)')
    ax[0,0].set_xlabel('Time/s')
    ax[0,0].set_ylabel('Input neuron #')
    fig.colorbar(pos,ax=ax[0,0])

    pos = ax[0,1].imshow(r[ind_min:ind_max].T,extent=[T_min,T_max,N,0], aspect='auto')
    # ax[0,1].plot(t_bar,z_bar,'r')
    ax[0,1].set_title('RA activity (f)')
    ax[0,1].set_xlabel('Time/s')
    ax[0,1].set_ylabel('RA neuron #')
    fig.colorbar(pos,ax=ax[0,1])

    ax[0,2].plot(r[ind_max],label='RA')
    ax[0,2].plot(I[ind_max],label='Input')
    ax[0,2].set_title('Activity & input, t='+str(T_max))
    ax[0,2].set_xlabel('RA neuron #')
    ax[0,2].set_ylabel('Activity')
    ax[0,2].legend()

    pos = ax[1,0].imshow(ra.W_trace[ind_min],aspect='auto',interpolation='nearest',extent=[0,N_g,N,0])
    ax[1,0].set_title('W, t ='+str(T_min))
    ax[1,0].set_xlabel('Input neuron #')
    ax[1,0].set_ylabel('RA neuron #')
    fig.colorbar(pos,ax=ax[1,0])

    pos = ax[1,1].imshow(ra.W_trace[ind_max],aspect='auto',interpolation='nearest',extent=[0,N_g,N,0])
    ax[1,1].set_title('W, t ='+str(T_max))
    ax[1,1].set_xlabel('Input neuron #')
    ax[1,1].set_ylabel('RA neuron #')
    fig.colorbar(pos,ax=ax[1,1])
    
    dW = ra.dW_Hebb_trace[ind_max] + ra.dW_postboost_trace[ind_max] + ra.dW_decay_trace[ind_max]
    pos = ax[1,2].imshow(dW,aspect='auto',interpolation='nearest',extent=[0,N_g,N,0])
    ax[1,2].set_title('dW, t ='+str(T_max))
    ax[1,2].set_xlabel('Input neuron #')
    ax[1,2].set_ylabel('RA neuron #')
    fig.colorbar(pos,ax=ax[1,2])

    pos = ax[2,0].imshow(ra.dW_Hebb_trace[ind_max],aspect='auto',interpolation='nearest',extent=[0,N_g,N,0])
    ax[2,0].set_title('dW Hebb, t='+str(T_max))
    ax[2,0].set_xlabel('Input neuron #')
    ax[2,0].set_ylabel('RA neuron #')
    fig.colorbar(pos,ax=ax[2,0])

    pos = ax[2,1].imshow(ra.dW_postboost_trace[ind_max] ,aspect='auto',interpolation='nearest',extent=[0,N_g,N,0])
    ax[2,1].set_title('dW postboost, t='+str(T_max))
    ax[2,1].set_xlabel('Input neuron #')
    ax[2,1].set_ylabel('RA neuron #')
    fig.colorbar(pos,ax=ax[2,1])

    pos = ax[2,2].imshow(ra.dW_decay_trace[ind_max] ,aspect='auto',interpolation='nearest',extent=[0,N_g,N,0])
    ax[2,2].set_title('dW decay, t='+str(T_max))
    ax[2,2].set_xlabel('Input neuron #')
    ax[2,2].set_ylabel('RA neuron #')
    fig.colorbar(pos,ax=ax[2,2])


    fig.tight_layout()


######### functions for generating ground truth, ER inputs, and input noise

def generate_ground_truth(dt, T, sigma_diffusion = 8, windowsize_diffusion = 1000):
    """generate ground truth angular velocity (AV) and head direction (HD) trajectories
    Args:
        dt: (float) simulation step size [s]
        T: (float) simulation length [s]
        sigma_diffusion: (float) standard deviation of diffusion [radian]
        windowsize_diffusion: (int) window size for moving mean [steps]
    Returns:
        v_AV: (np.ndarray of shape (n_timesteps,)) ground truth AV [radian/s]
        z_HD: (np.ndarray of shape (n_timesteps,)) ground truth HD [radian]
    """

    # number of time steps
    n_timesteps = int(T / dt)

    # ground truth AV
    du = sigma_diffusion * np.sqrt(dt) * np.random.normal(size = n_timesteps)  # diffusion
    v = du / dt  # instantaneous AV
    v_AV = movmean(v, windowsize_diffusion)  # smooth instantaneous AV to get ground truth AV

    # ground truth HD
    z_HD = np.zeros(n_timesteps)  # initialize array for storing ground truth HD
    z = du[0].copy()              # initialize HD
    z_HD[0] = z
    for t in range(1, n_timesteps):
        z = back_to_circ(z + v_AV[t] * dt)  # integrate ground truth AV
        z_HD[t] = z

    return v_AV, z_HD

def generate_ER_input(ra, T, v_AV, z_HD, w = 0.8, h_scale = 2):
    """generate normal and inverted gain ER inputs
    Args:
        ra: ring attractor object from the class RingAttractorNetwork()
        T: (float) simulation length [s]
        v_AV: (np.ndarray of shape (n_timesteps,)) ground truth AV [radian/s]
        z_HD: (np.ndarray of shape (n_timesteps,)) ground truth HD [radian]
        w: (float) width of ER input
        h_scale: (float) amplitude of ER input relative to steady-state bump amplitude
            of ring attractor (RA) with neither ER input nor noise
    Returns:
        g: (np.ndarray of shape (n_timesteps, ra.N)) normal gain ER input
        g_invert: (np.ndarray of shape (n_timesteps, ra.N)) inverted gain ER input
        h: (float) amplitude of ER input
    """

    # number of time steps
    n_timesteps = int(T / ra.dt)

    # ER input amplitude
    h0, _ = ra.determine_features_basic(ydata = ra.r_init)  # steady-state RA bump amplitude
    h = h_scale * h0

    # initialization
    z = z_HD[0].copy()  # initialize HD for normal gain
    z_invert = z_HD[0].copy()  # initialize HD for inverted gain
    g = np.zeros((n_timesteps, ra.N))  # initialize array for storing normal gain ER input
    g_invert = np.zeros((n_timesteps, ra.N))  # initialize array for storing inverted gain ER input

    # generate inhibitory von Mises ER input
    g[0] = ra.create_vM_input(back_to_circ(z + np.pi), w, h)
    g_invert[0] = ra.create_vM_input(back_to_circ(z_invert + np.pi), w, h)
    for t in range(1,int(T/ra.dt)):
        # normal gain
        z = z_HD[t]
        g[t] = ra.create_vM_input(z + np.pi, w, h)  # center von Mises opposite HD

        # inverted gain
        z_invert = back_to_circ(z_invert - v_AV[t] * ra.dt)  # update HD according to inverted gain
        g_invert[t] = ra.create_vM_input(z_invert + np.pi, w, h)  # center von Mises opposite inverted gain HD

    return g, g_invert, h

def generate_AV_input_noise(dt, T, sigma_AV = 1, windowsize_AV = 16):
    """generate angular velocity (AV) input noise
    Args:
        dt: (float) simulation step size [s]
        T: (float) simulation length [s]
        sigma_AV: (float) standard deviation of AV input noise [radian/s]
        windowsize_AV: (int) window size for moving mean [steps]
    Returns:
        noise_AV: (np.ndarray of shape (n_timesteps,)) AV input noise
    """

    # number of time steps
    n_timesteps = int(T / dt)

    # generate zero-mean Gaussian noise
    noise_AV = np.random.normal(0, sigma_AV / np.sqrt(dt), n_timesteps)  # shape (n_timesteps,)

    # smooth, i.e. low-pass filter, noise
    noise_AV = movmean(noise_AV, windowsize_AV)  # shape (n_timesteps,)

    return noise_AV

def generate_ER_input_noise(g, sigma_g = 1):
    """generate ER input noise
    Args:
        sigma_g: (float) standard deviation of ER input noise
        g: (np.ndarray of shape (n_timesteps, ra.N)) ER activity
    Returns:
        noise_g: (np.ndarray of shape (n_timesteps, ra.N)) ER input noise
    """

    noise_g = np.random.uniform(0, sigma_g, g.shape)

    return noise_g