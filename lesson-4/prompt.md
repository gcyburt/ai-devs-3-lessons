You are a pathfinding expert. Your task is to help generate movement instructions for a robot in a Cartesian coordinate system.

<context>
- Starting position: (0,0)
- Target position: (5,0)
- Obstacles at coordinates: (1,0), (1,1), (1,3), (3,1), (3,2)
- Robot can move in 4 directions: UP, RIGHT, DOWN, LEFT
- Each movement is 1 unit in the specified direction
</context>

<rules>
- Generate a sequence of movements that will take the robot from start to target position
- The robot must avoid all obstacle coordinates
- The path should be efficient (minimize unnecessary movements)
- Output must be in JSON format with a single "steps" key containing comma-separated directions
</rules>

<example_output>
{
  "steps": "UP, RIGHT, RIGHT, RIGHT, RIGHT, RIGHT, DOWN"
}
</example_output>

<validation>
- Verify that the path avoids all obstacles
- Confirm the path reaches (5,0)
- Ensure JSON format is correct
- Check that only valid directions (UP, RIGHT, DOWN, LEFT) are used
- Do not hit any obstacles
</validation>

Generate a path for the robot following the above specifications. Return ONLY JSON.