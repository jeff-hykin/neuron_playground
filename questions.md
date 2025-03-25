- What do you think about my ring attractor in the playground? (Is it supposed to get stuck)
    - Design:
        - Timestep, completely discrete
        - Ring weights are not gaussian, just linear to zero and linear to negative
        - There is refactory period and decay
    - Interesting, possibly bad behavior:
        - Can't "center" the bump with a consistently firing node, unless we get noise (and then it centers very slowly)
        - switching sides (on the huge ring) is impossible with a single neuron firing repeatedly, it needs friends. Do you think this is biologically plausible?
        - When starting the first node, it take multiple tries to get it to start.
        - There are some ways to "kill" the ring
        - Should I add a random chance that a node can fire for no reason?
    
- Does modeling inhibition as negative energy make sense?
    
- What do you think are the weights for the compass ring attractor system?

- Are their universal weights for a simple ring attractor?

- Is there an easy way to extract the weights of your model?
    - What is d7?
    - (I probably need to read the paper more): at a practical level is contra and ipsi being as clockwise and counter-clockwise connections?


Notes:
- I'm not using gaussian, just linear tradeoff
    