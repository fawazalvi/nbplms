using System.Security.Cryptography;
using System.Text;
using Nbp.Pms.Application.Interfaces;

namespace Nbp.Pms.Infrastructure.Services;

/// <summary>
/// AES-256-GCM Application-Layer Field Encryption.
/// Encrypts protected scores, ratings, and confidential comments before database insertion.
/// Direct database queries by DBAs will return ciphertext only.
/// </summary>
public class AesGcmEncryptionService : IEncryptionService
{
    private readonly byte[] _masterKey;

    public AesGcmEncryptionService(string base64MasterKey)
    {
        if (string.IsNullOrWhiteSpace(base64MasterKey))
        {
            // Pilot fallback key (32 bytes = 256 bits)
            _masterKey = Encoding.UTF8.GetBytes("NbpPerformanceManagementSystem26");
        }
        else
        {
            _masterKey = Convert.FromBase64String(base64MasterKey);
        }
    }

    public string Encrypt(string plaintext, int keyVersion = 1)
    {
        if (string.IsNullOrEmpty(plaintext)) return plaintext;

        byte[] nonce = new byte[12]; // 96-bit nonce for GCM
        RandomNumberGenerator.Fill(nonce);

        byte[] plainBytes = Encoding.UTF8.GetBytes(plaintext);
        byte[] cipherBytes = new byte[plainBytes.Length];
        byte[] tag = new byte[16]; // 128-bit authentication tag

        using var aesGcm = new AesGcm(_masterKey, 16);
        aesGcm.Encrypt(nonce, plainBytes, cipherBytes, tag);

        // Payload format: KeyVersion (1 byte) | Nonce (12 bytes) | Tag (16 bytes) | Ciphertext
        byte[] payload = new byte[1 + nonce.Length + tag.Length + cipherBytes.Length];
        payload[0] = (byte)keyVersion;
        Buffer.BlockCopy(nonce, 0, payload, 1, nonce.Length);
        Buffer.BlockCopy(tag, 0, payload, 1 + nonce.Length, tag.Length);
        Buffer.BlockCopy(cipherBytes, 0, payload, 1 + nonce.Length + tag.Length, cipherBytes.Length);

        return Convert.ToBase64String(payload);
    }

    public string Decrypt(string ciphertext, int keyVersion = 1)
    {
        if (string.IsNullOrEmpty(ciphertext)) return ciphertext;

        try
        {
            byte[] payload = Convert.FromBase64String(ciphertext);
            if (payload.Length < 1 + 12 + 16) return ciphertext; // Not encrypted / legacy

            byte version = payload[0];
            byte[] nonce = new byte[12];
            byte[] tag = new byte[16];
            byte[] cipherBytes = new byte[payload.Length - 1 - 12 - 16];

            Buffer.BlockCopy(payload, 1, nonce, 0, 12);
            Buffer.BlockCopy(payload, 13, tag, 0, 16);
            Buffer.BlockCopy(payload, 29, cipherBytes, 0, cipherBytes.Length);

            byte[] plainBytes = new byte[cipherBytes.Length];

            using var aesGcm = new AesGcm(_masterKey, 16);
            aesGcm.Decrypt(nonce, cipherBytes, tag, plainBytes);

            return Encoding.UTF8.GetString(plainBytes);
        }
        catch
        {
            // If decryption fails (e.g. invalid format), return fallback/masked
            return "[Encrypted Record]";
        }
    }
}
