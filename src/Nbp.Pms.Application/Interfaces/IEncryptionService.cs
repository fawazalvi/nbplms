namespace Nbp.Pms.Application.Interfaces;

public interface IEncryptionService
{
    string Encrypt(string plaintext, int keyVersion = 1);
    string Decrypt(string ciphertext, int keyVersion = 1);
}
