package br.com.dosecerta.dose.certa.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.Date;

@Service
public class JwtService {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration}")
    private Long expiration;

    /**
     * FIX C-04: Valida que o secret tem pelo menos 32 bytes (256 bits)
     * para garantir segurança mínima do HS256.
     */
    @PostConstruct
    public void validateSecret() {
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < 32) {
            throw new IllegalStateException(
                "ERRO DE CONFIGURAÇÃO: jwt.secret deve ter pelo menos 32 caracteres (256 bits). " +
                "Chave atual tem apenas " + keyBytes.length + " bytes. " +
                "Configure uma chave segura no arquivo application.properties ou variável de ambiente JWT_SECRET."
            );
        }
    }

    public String gerarToken(String login, String perfil) {
        return Jwts.builder()
                .setSubject(login)
                .claim("perfil", perfil)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(
                        Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8)),
                        SignatureAlgorithm.HS256
                )
                .compact();
    }

    public String getLogin(String token) {
        return getClaims(token).getSubject();
    }

    public String getPerfil(String token) {
        return getClaims(token).get("perfil", String.class);
    }

    private io.jsonwebtoken.Claims getClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(secret.getBytes(StandardCharsets.UTF_8))
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}
