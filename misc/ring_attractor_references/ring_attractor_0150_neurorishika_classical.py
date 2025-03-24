# from: https://github.com/neurorishika/pyCN-modelzoo/blob/main/projects/HD-Models/classical-ringattractor.ipynb
import numpy as np
import matplotlib.pyplot as plt

## Head-Direction Ring Attractor Model

# Parameters
N_L = 8 # number of neurons
N_R = 8 # number of neurons
N_bump = 8 # number of neurons
N = N_bump + N_L + N_R + 1 # total number of neurons

Exc = 1 # Excitation distance

# Connectivity matrix
C_inh = np.zeros((N,N))
C_exc = np.zeros((N,N))

# Bump local connections
for i in range(-Exc,N_bump+Exc):
    for j in range(-Exc,N_bump+Exc):
        if i==j:
            continue
        if abs(i-j) <= Exc:
            C_exc[i%N_bump, j%N_bump] = 1

# Left local connections
for i in range(N_bump):
    C_exc[N_bump + i, i] = 2

# Right local connections
for i in range(N_bump):
    C_exc[N_bump + N_L + i, i] = 2

# Bump to inhibitory connections
for i in range(N_bump):
    C_exc[-1, i] = 2

# Global inhibitory connections
for i in range(N_bump):
    C_inh[i, -1] = 1

# left shifted connections
for i in range(N_L):
    C_exc[i, N_bump + (i - 1)%N_L] = 2
    C_exc[i, N_bump + (i - 2)%N_L] = 1

# right shifted connections
for i in range(N_R):
    C_exc[i, N_bump + N_L + (i + 1)%N_R] = 2
    C_exc[i, N_bump + N_L + (i + 2)%N_R] = 1

# Plot connectivity matrices
fig, ax = plt.subplots(1,2, figsize=(6,3))
ax[0].imshow(C_exc, cmap='gray')
ax[0].set_title('Excitatory')
ax[1].imshow(C_inh, cmap='gray')
ax[1].set_title('Inhibitory')
plt.show()

# 
# 
# 


# LIF neuron model (with noise)
tau = 2 # ms

tau_inh = 5 # ms
tau_exc = 5 # ms

Cm = 1 # nF

dt = 0.1 # ms
theta = -30 # mV
reset = -70 # mV

leak_voltage = -55 # mV
inh_voltage = -70 # mV
exc_voltage = 0 # mV

inh_conductance = 10.0
exc_conductance = 5.0

noise_scale = 10

# sinusoidal input
I_ext = 50 * np.concatenate((np.ones(N_bump), np.zeros(N_L), np.zeros(N_R), np.zeros(1)))

# leftward input
Lstim = np.concatenate((np.zeros(N_bump), np.ones(N_L), np.zeros(N_R), np.zeros(1)))
# rightward input
Rstim = np.concatenate((np.zeros(N_bump), np.zeros(N_L), np.ones(N_R), np.zeros(1)))

def lif_update(x,inh_gate,exc_gate,I_L, I_R):
    I_leak = - (x-leak_voltage)/tau
    I_inh = - inh_conductance * inh_gate * (x-inh_voltage)
    I_exc =  - exc_conductance * exc_gate * (x-exc_voltage)
    I_hd = I_L * Lstim + I_R * Rstim

    x += dt/tau * (I_leak + I_inh + I_exc + np.random.randn(N)*noise_scale + I_ext + I_hd)
    inh_gate += dt/tau_inh * (-inh_gate + C_inh @ (x>theta))
    exc_gate += dt/tau_exc * (-exc_gate + C_exc @ (x>theta))
    x[x>theta] = reset
    return x,inh_gate,exc_gate

phase = 2*np.pi*np.random.rand()

# Simulation
T = 10000
xs = np.zeros((T,N))
inh_gates = np.zeros((T,N))
exc_gates = np.zeros((T,N))
spikes = np.zeros((T,N))

xs[0,:] = leak_voltage * np.ones(N)
phase = 0 
for t in range(1,T):
    if t<1000:
        I_L = 0
        I_R = 0
    elif t<5000:
        I_L = 10
        I_R = 0
    elif t<8000:
        I_L = 0
        I_R = 10
    else:
        I_L = 0
        I_R = 0

    xs[t,:],inh_gates[t,:],exc_gates[t,:] = lif_update(xs[t-1,:],inh_gates[t-1,:],exc_gates[t-1,:],I_L, I_R)
    spikes[t,:] = xs[t,:] == reset

# Plot
plt.figure(figsize=(12,2))
for i in range(N):
    plt.plot(xs[:,i]-i*60)
plt.show()

#plot spikes as raster
plt.figure(figsize=(12,2))
for i in range(N):
    plt.plot(np.where(spikes[:,i]==1)[0],-i*np.ones(np.sum(spikes[:,i]==1)),'k|')

# 
# 
#  
plt.figure(figsize=(12,10))
for i in range(N):
    plt.plot(exc_gates[:,i]-i*0.5)
plt.show()
