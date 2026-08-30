namespace Nbp.Pms.Domain.Entities;

public class WorkflowNotificationConfig
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public string TransitionKey { get; set; } = string.Empty;
    
    public bool IsEnabled { get; set; } = true;
    
    public string NotifyRoles { get; set; } = string.Empty;
}
