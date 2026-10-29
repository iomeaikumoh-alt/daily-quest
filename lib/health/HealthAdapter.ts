/**
 * HealthAdapter is the only boundary the app needs for health data.
 * Replace MockHealthAdapter with a Health Connect implementation later;
 * quest evaluation and the rest of the UI can remain unchanged.
 */
export interface HealthAdapter {
  getSteps(): Promise<number>;
  getSleepHours(): Promise<number>;
  getWeight(): Promise<number>;
  getMedicationTaken(): Promise<boolean>;
}

export class MockHealthAdapter implements HealthAdapter {
  constructor(private readonly stepsProvider: () => number = () => 3200) {}

  async getSteps(): Promise<number> {
    return this.stepsProvider();
  }

  async getSleepHours(): Promise<number> {
    return 6.5;
  }

  async getWeight(): Promise<number> {
    return 68.2;
  }

  async getMedicationTaken(): Promise<boolean> {
    return false;
  }
}