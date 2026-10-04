package com.dbshield.infrastructure.security;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Arrays;

@Component
public class ConnectionCredentials {
    private final SecretKeySpec key;
    public ConnectionCredentials(@Value("${connections.secret:${jwt.secret}}") String secret) throws Exception {
        key = new SecretKeySpec(MessageDigest.getInstance("SHA-256").digest(secret.getBytes(StandardCharsets.UTF_8)), "AES");
    }
    public String encrypt(String password) {
        try {
            byte[] nonce = new byte[12]; new SecureRandom().nextBytes(nonce);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(128, nonce));
            byte[] ciphertext = cipher.doFinal(password.getBytes(StandardCharsets.UTF_8));
            byte[] result = Arrays.copyOf(nonce, nonce.length + ciphertext.length);
            System.arraycopy(ciphertext, 0, result, nonce.length, ciphertext.length);
            return Base64.getEncoder().encodeToString(result);
        } catch (Exception error) { throw new IllegalStateException("No se pudo cifrar la credencial", error); }
    }
    public String decrypt(String value) {
        try {
            byte[] data = Base64.getDecoder().decode(value);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(128, Arrays.copyOf(data, 12)));
            return new String(cipher.doFinal(Arrays.copyOfRange(data, 12, data.length)), StandardCharsets.UTF_8);
        } catch (Exception error) { throw new IllegalStateException("No se pudo descifrar la credencial", error); }
    }
}
