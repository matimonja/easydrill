export interface Command {
  execute(): void;
  undo(): void;
}

export class CommandManager {
  private history: Command[] = [];
  private redoStack: Command[] = [];
  private maxHistory: number = 50;

  public execute(command: Command) {
    command.execute();
    this.history.push(command);
    this.redoStack = []; 
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  public undo() {
    const command = this.history.pop();
    if (command) {
      command.undo();
      this.redoStack.push(command);
    }
  }

  public redo() {
    const command = this.redoStack.pop();
    if (command) {
      command.execute();
      this.history.push(command);
    }
  }
}
