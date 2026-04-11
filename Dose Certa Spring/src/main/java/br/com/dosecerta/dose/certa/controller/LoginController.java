package br.com.dosecerta.dose.certa.controller;

import br.com.dosecerta.dose.certa.dto.LoginRequestDTO;
import br.com.dosecerta.dose.certa.dto.LoginResponseDTO;
import br.com.dosecerta.dose.certa.service.AuthService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/login")
public class LoginController {

    private final AuthService authService;

    public LoginController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping
    public LoginResponseDTO login(@RequestBody LoginRequestDTO dto) {
        return authService.autenticar(dto.getLogin(), dto.getSenha());
    }

}
