package com.tennisoop.api.auth.service;

import com.tennisoop.api.auth.JwtTokenProvider;
import com.tennisoop.api.auth.domain.*;
import com.tennisoop.api.auth.mapper.AuthMapper;
import com.tennisoop.api.config.JwtConfig;
import com.tennisoop.api.exception.ConflictException;
import com.tennisoop.api.exception.UnauthorizedException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthMapper authMapper;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;
    private final JwtConfig jwtConfig;

    @Transactional
    public LoginResponse register(RegisterRequest request) {
        if (authMapper.existsByEmail(request.getEmail())) {
            throw new ConflictException("このメールアドレスはすでに登録されています");
        }

        User user = new User();
        user.setId(UUID.randomUUID().toString());
        user.setEmail(request.getEmail());
        user.setName(request.getName());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setCreatedAt(LocalDateTime.now());

        authMapper.insertUser(user);

        String accessToken = jwtTokenProvider.generateAccessToken(user.getId(), user.getEmail());
        String refreshToken = jwtTokenProvider.generateRefreshToken();

        saveRefreshToken(user.getId(), refreshToken);

        log.info("ユーザー登録: userId={}, email={}", user.getId(), user.getEmail());
        return new LoginResponse(
            accessToken,
            refreshToken,
            new LoginResponse.UserInfo(user.getId(), user.getName(), user.getEmail())
        );
    }

    @Transactional
    public LoginResponse login(LoginRequest request) {
        User user = authMapper.findByEmail(request.getEmail())
            .orElseThrow(() -> new UnauthorizedException("メールアドレスまたはパスワードが正しくありません"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new UnauthorizedException("メールアドレスまたはパスワードが正しくありません");
        }

        String accessToken = jwtTokenProvider.generateAccessToken(user.getId(), user.getEmail());
        String refreshToken = jwtTokenProvider.generateRefreshToken();

        saveRefreshToken(user.getId(), refreshToken);

        log.info("ログイン: userId={}", user.getId());
        return new LoginResponse(
            accessToken,
            refreshToken,
            new LoginResponse.UserInfo(user.getId(), user.getName(), user.getEmail())
        );
    }

    @Transactional
    public String refresh(TokenRefreshRequest request) {
        String tokenHash = hashToken(request.getRefreshToken());

        RefreshToken refreshToken = authMapper.findRefreshToken(tokenHash)
            .orElseThrow(() -> new UnauthorizedException("リフレッシュトークンが無効または期限切れです"));

        User user = authMapper.findById(refreshToken.getUserId())
            .orElseThrow(() -> new UnauthorizedException("ユーザーが見つかりません"));

        // 古いリフレッシュトークンを削除して新しいAccessTokenを発行
        authMapper.deleteRefreshToken(tokenHash);

        log.info("トークンリフレッシュ: userId={}", user.getId());
        return jwtTokenProvider.generateAccessToken(user.getId(), user.getEmail());
    }

    @Transactional
    public void logout(TokenRefreshRequest request) {
        String tokenHash = hashToken(request.getRefreshToken());
        authMapper.deleteRefreshToken(tokenHash);
        log.info("ログアウト");
    }

    private void saveRefreshToken(String userId, String rawToken) {
        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setId(UUID.randomUUID().toString());
        refreshToken.setUserId(userId);
        refreshToken.setTokenHash(hashToken(rawToken));
        refreshToken.setExpiresAt(
            LocalDateTime.now().plusSeconds(jwtConfig.getRefreshExpiration() / 1000));
        refreshToken.setCreatedAt(LocalDateTime.now());
        authMapper.insertRefreshToken(refreshToken);
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("Failed to hash token", e);
        }
    }
}
