import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;

import java.nio.charset.StandardCharsets;
import java.util.Date;

public class JwtGen {
  public static void main(String[] args) {
    String secret = "MINHA_CHAVE_SUPER_SECRETA_JWT_256_BITS_DOSE_CERTA_2025";
    long expiration = 86400000L;

    String login = args.length > 0 ? args[0] : "admin";
    String perfil = args.length > 1 ? args[1] : "ADMIN";

    String token = Jwts.builder()
        .setSubject(login)
        .claim("perfil", perfil)
        .setIssuedAt(new Date())
        .setExpiration(new Date(System.currentTimeMillis() + expiration))
        .signWith(Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8)), SignatureAlgorithm.HS256)
        .compact();

    System.out.println(token);
  }
}
