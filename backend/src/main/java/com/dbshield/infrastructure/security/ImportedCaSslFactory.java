package com.dbshield.infrastructure.security;

import javax.net.ssl.*;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.security.cert.*;
import java.util.*;
import java.util.regex.Pattern;

/** Cada conexión tiene su propio almacén de confianza; no modifica el JVM global. */
public class ImportedCaSslFactory extends SSLSocketFactory {
    private final SSLSocketFactory delegate;
    public static final int MAX_PEM_SIZE = 262144;
    private static final Pattern CERT = Pattern.compile("-----BEGIN CERTIFICATE-----[\\s\\S]*?-----END CERTIFICATE-----");
    public ImportedCaSslFactory(Properties properties) throws GeneralSecurityException {
        String pem = properties.getProperty("dbshield.ssl.ca", "");
        TrustManagerFactory managers = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());
        KeyStore trust = null;
        if (!pem.isBlank()) {
            trust = KeyStore.getInstance(KeyStore.getDefaultType());
            try { trust.load(null, null); } catch (IOException exception) { throw new GeneralSecurityException(exception); }
            int index = 0;
            for (X509Certificate certificate : certificates(pem)) trust.setCertificateEntry("ca-" + index++, certificate);
        }
        managers.init(trust);
        SSLContext context = SSLContext.getInstance("TLS");
        context.init(null, managers.getTrustManagers(), null);
        delegate = context.getSocketFactory();
    }
    public static List<X509Certificate> certificates(String pem) throws CertificateException {
        if (pem == null || pem.isBlank() || pem.length() > MAX_PEM_SIZE || pem.contains("PRIVATE KEY"))
            throw new CertificateException("Importa únicamente un certificado CA PEM válido, máximo 256 KB.");
        var matcher = CERT.matcher(pem);
        var result = new ArrayList<X509Certificate>();
        CertificateFactory factory = CertificateFactory.getInstance("X.509");
        while (matcher.find()) {
            X509Certificate certificate = (X509Certificate) factory.generateCertificate(new ByteArrayInputStream(matcher.group().getBytes(StandardCharsets.US_ASCII)));
            // Los bundles públicos pueden incluir raíces expiradas: el handshake valida
            // la cadena elegida. Cada certificado debe ser una autoridad, no una clave.
            if (certificate.getBasicConstraints() < 0) throw new CertificateException("El archivo debe contener certificados de autoridad CA.");
            result.add(certificate);
        }
        if (result.isEmpty()) throw new CertificateException("El archivo no contiene certificados PEM.");
        return result;
    }
    @Override public String[] getDefaultCipherSuites() { return delegate.getDefaultCipherSuites(); }
    @Override public String[] getSupportedCipherSuites() { return delegate.getSupportedCipherSuites(); }
    @Override public Socket createSocket() throws IOException { return delegate.createSocket(); }
    @Override public Socket createSocket(Socket socket, String host, int port, boolean close) throws IOException { return delegate.createSocket(socket, host, port, close); }
    @Override public Socket createSocket(String host, int port) throws IOException { return delegate.createSocket(host, port); }
    @Override public Socket createSocket(String host, int port, InetAddress local, int localPort) throws IOException { return delegate.createSocket(host, port, local, localPort); }
    @Override public Socket createSocket(InetAddress host, int port) throws IOException { return delegate.createSocket(host, port); }
    @Override public Socket createSocket(InetAddress host, int port, InetAddress local, int localPort) throws IOException { return delegate.createSocket(host, port, local, localPort); }
}
