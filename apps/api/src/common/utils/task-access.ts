import { ForbiddenException } from '@nestjs/common';

interface TaskWithAssignments {
  assignments: { evaluatorId: string }[];
}

/**
 * Tasks with explicit evaluator assignments are restricted to those
 * evaluators. Tasks with no assignments at all are open to any evaluator
 * in the organization (so unassigned/open tasks remain workable).
 */
export function assertEvaluatorAssigned(task: TaskWithAssignments, userId: string): void {
  if (
    task.assignments.length > 0 &&
    !task.assignments.some((assignment) => assignment.evaluatorId === userId)
  ) {
    throw new ForbiddenException('You are not assigned to this task');
  }
}
