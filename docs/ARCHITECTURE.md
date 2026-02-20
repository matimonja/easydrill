# Tactical Board Architecture

## Overview
This project is a web-based tactical sports board application built with TypeScript and HTML5 Canvas. It allows users to draw shapes, place players, and visualize tactics on a field hockey pitch (configurable).

## Core Design Patterns

### 1. Game Loop & Mediator Pattern (`src/core/Game.ts`)
The `Game` class acts as the central controller (Mediator). It initializes the system, manages the rendering loop (`requestAnimationFrame`), and coordinates communication between:
- **Input/Tools**: User interactions.
- **Data/Entities**: The state of the board.
- **View/Canvas**: The visual representation.
- **UI**: The HTML overlay controls.

### 2. State Pattern for Tools (`src/tools/`)
Interaction logic is encapsulated in specific `Tool` classes. The `Game` context delegates input events (`mousedown`, `mousemove`, `mouseup`) to the active tool.
- **`Tool` Interface**: Defines the contract for input handling and rendering.
- **`SelectTool`**: Handles entity selection, moving (drag), resizing (handles), and rotation.
- **`ShapeTool`**: Handles the creation of geometric shapes (Rectangle, Circle, Triangle, Line, Freehand).
- **`PlayerTool`**: Handles the instantiation of Player entities.
- **`CameraTool`**: Handles canvas panning interactions.

### 3. Command Pattern (`src/core/Commands.ts`, `src/core/CommandManager.ts`)
All state-modifying actions (Add, Remove, Move) are encapsulated as `Command` objects. This enables a robust Undo/Redo system.
- `CommandManager`: Maintains the history stack.
- `AddEntityCommand`, `RemoveEntityCommand`, `MoveEntityCommand`: Concrete implementations.

### 4. Entity Component System (Simplified) (`src/entities/`)
Entities are the objects drawn on the canvas.
- **`Entity` Interface**: Common properties (`x`, `y`, `draw`, `containsPoint`).
- **`Player`**: Represents a tactical player token.
- **`BaseShape`**: Abstract base for all shapes. Handles common properties like color, stroke style, and resize handles.
- **`Field`**: Renders the background pitch.

### 5. Camera System (`src/core/Camera.ts`)
Manages the view transformation (Translation, Scale/Zoom, Rotation).
- Converts between **Screen Coordinates** (Mouse events) and **World Coordinates** (Canvas drawing).
- Supports Panning, Zooming, and 90-degree Rotation.

### 6. Animation System (`src/core/AnimationManager.ts`)
Manages the playback of tactical sequences. It does NOT update the entities directly but maintains a separate simulation state:
- **Interpolation**: Calculates intermediate positions for Players and Balls based on the active Action and `dt`.
- **State Management**: Tracks `PlayerAnimState` (current action, queue, waiting for ball) and `BallState` (held, moving, loose).
- **Memento Pattern**: Stores the initial state of all entities to allow resetting (`stop()`) after playback.

### 7. Action System (`src/entities/Action.ts`)
Actions define the *behavior* and *path* of players during animation.
- **`BaseAction`**: Abstract base class. Defines properties like `speed`, `pathType` (straight/freehand), and physics flags.
- **`ActionType`**: 'run', 'dribble', 'pass', 'shoot', 'tackle', 'turn'.
- **Physics**:
    - `movesPlayer`: If true, the player follows the path.
    - `ballInteraction`: 'none', 'carry' (ball follows player), 'propel' (ball moves independently).

## Directory Structure
```
src/
├── config/         # Default configurations (colors, shapes)
├── core/           # Core engine logic
│   ├── Game.ts     # Main controller
│   ├── AnimationManager.ts # Animation logic
│   ├── Camera.ts   # View transform logic
│   ├── Commands.ts # Command definitions
│   ├── Interfaces.ts # Decoupling interfaces
│   └── ...
├── entities/       # Game objects
│   ├── Player.ts
│   ├── Action.ts   # Action definitions
│   ├── ExerciseObjects.ts # Cones, Balls, Groups
│   ├── Field.ts
│   └── Shape.ts
├── tools/          # Interaction logic (State Pattern)
│   ├── ActionTool.ts # Creating actions
│   ├── ExerciseTool.ts # Placing cones/bails
│   └── ...
├── main.ts         # Entry point for the Board Engine
├── marketplace.ts  # Entry point for Marketplace page
├── home.ts         # Entry point for Home page
└── ...             # Other platform entry points
```

## Future Refactoring Opportunities
- **UI Manager**: The `Game` class currently handles DOM updates. This logic should be extracted into a `UIManager` class to separate View logic from Game logic completely.
- **Event Bus**: Decouple UI components from the Game instance using an event-based system.

