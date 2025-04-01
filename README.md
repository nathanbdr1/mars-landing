# Mars Landing Game

A simple 2D Mars landing game where you control a spacecraft and try to land it safely on the landing pad.

## Requirements
- Python 3.x
- Pygame

## Installation
1. Install the required dependencies:
```bash
pip install -r requirements.txt
```

## How to Play
Run the game:
```bash
python mars_landing.py
```

### Controls
- **Spacebar**: Hold to activate the spacecraft's engine
- **Release Spacebar**: Deactivate the engine

### Objective
Land your spacecraft safely on the green landing pad. You must:
1. Land on the green landing pad
2. Maintain a landing speed below 3 units
3. Manage your fuel carefully

### Game Over Conditions
- Success: Landing safely on the pad at the correct speed
- Failure: 
  - Crashing into the ground
  - Landing too fast
  - Running out of fuel before landing 