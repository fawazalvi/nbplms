using Xunit;
using Nbp.Pms.Application.Services;
using Nbp.Pms.Contracts.Enums;
using Nbp.Pms.Domain.Entities;

namespace Nbp.Pms.UnitTests;

public class WorkflowEngineTests
{
    private readonly WorkflowEngine _workflowEngine;

    public WorkflowEngineTests()
    {
        _workflowEngine = new WorkflowEngine();
    }

    [Fact]
    public void SubmitObjectives_ValidEmployee_TransitionsToObjectiveSubmittedAndGeneratesAuditLog()
    {
        // Arrange
        var cycle = new EmployeeCycle { CurrentStatus = WorkflowStatus.ObjectiveDraft };

        // Act
        var result = _workflowEngine.Transition(cycle, WorkflowStatus.ObjectiveSubmitted, "84920", "Employee");

        // Assert
        Assert.True(result.Success);
        Assert.Equal(WorkflowStatus.ObjectiveSubmitted, cycle.CurrentStatus);
        Assert.NotNull(result.AuditLog);
        Assert.Equal("WORKFLOW_TRANSITION_ObjectiveDraft_TO_ObjectiveSubmitted", result.AuditLog.EventType);
    }

    [Fact]
    public void ReturnObjectives_WithoutComments_FailsValidation()
    {
        // Arrange
        var cycle = new EmployeeCycle { CurrentStatus = WorkflowStatus.ObjectiveSubmitted };

        // Act (No comments provided)
        var result = _workflowEngine.Transition(cycle, WorkflowStatus.ObjectiveReturned, "91204", "FirstAppraiser", comments: null);

        // Assert
        Assert.False(result.Success);
        Assert.Contains("Mandatory comments are required", result.Message);
        Assert.Equal(WorkflowStatus.ObjectiveSubmitted, cycle.CurrentStatus);
    }

    [Fact]
    public void AdministrativeCompletion_UsesDistinctStatus_NeverRecordedAsAgreement()
    {
        // Arrange
        var cycle = new EmployeeCycle { CurrentStatus = WorkflowStatus.Published };

        // Act
        var result = _workflowEngine.Transition(cycle, WorkflowStatus.AdministrativelyCompleted, "PMW_ADMIN", "PmwAdmin", comments: "Deadline expired");

        // Assert
        Assert.True(result.Success);
        Assert.Equal(WorkflowStatus.AdministrativelyCompleted, cycle.CurrentStatus);
        Assert.NotEqual(WorkflowStatus.EmployeeAgreed, cycle.CurrentStatus); // Non-negotiable quality gate
    }
}
