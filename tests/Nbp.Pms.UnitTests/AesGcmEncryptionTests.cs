using Xunit;
using Nbp.Pms.Infrastructure.Services;

namespace Nbp.Pms.UnitTests;

public class AesGcmEncryptionTests
{
    private readonly AesGcmEncryptionService _encryptionService;

    public AesGcmEncryptionTests()
    {
        // 32-byte base64 key
        string testKeyBase64 = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes("NbpPerformanceManagementSystem26"));
        _encryptionService = new AesGcmEncryptionService(testKeyBase64);
    }

    [Fact]
    public void Encrypt_ProducesCiphertext_UnreadableAsPlaintext()
    {
        // Arrange
        string plaintextScore = "4.85";

        // Act
        string ciphertext = _encryptionService.Encrypt(plaintextScore);

        // Assert
        Assert.NotNull(ciphertext);
        Assert.NotEqual(plaintextScore, ciphertext);
        Assert.False(ciphertext.Contains("4.85"), "Direct SQL access by DBAs must not reveal plaintext scores.");
    }

    [Fact]
    public void Decrypt_RestoresOriginalPlaintext()
    {
        // Arrange
        string originalComment = "Confidential Manager Assessment: High Potential Leader";

        // Act
        string ciphertext = _encryptionService.Encrypt(originalComment);
        string decrypted = _encryptionService.Decrypt(ciphertext);

        // Assert
        Assert.Equal(originalComment, decrypted);
    }

    [Fact]
    public void Encrypt_TwoInvocationsWithSamePlaintext_ProduceDifferentCiphertextsDueToRandomNonce()
    {
        // Arrange
        string secretText = "Rating: Outstanding";

        // Act
        string ciphertext1 = _encryptionService.Encrypt(secretText);
        string ciphertext2 = _encryptionService.Encrypt(secretText);

        // Assert
        Assert.NotEqual(ciphertext1, ciphertext2); // AES-GCM 96-bit random IV ensures uniqueness
    }
}
