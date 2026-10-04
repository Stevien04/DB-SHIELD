package com.dbshield;

import com.dbshield.infrastructure.security.JwtRequestFilter;
import com.dbshield.infrastructure.security.JwtService;
import com.dbshield.infrastructure.security.UserDetailsServiceImpl;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class JwtRequestFilterTest {
    JwtService tokens = mock(JwtService.class);
    UserDetailsServiceImpl users = mock(UserDetailsServiceImpl.class);
    JwtRequestFilter filter = new JwtRequestFilter(tokens, users);
    FilterChain chain = mock(FilterChain.class);

    @AfterEach void clear() { SecurityContextHolder.clearContext(); }

    MockHttpServletRequest request() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/users");
        request.setServletPath("/api/v1/users");
        request.addHeader("Authorization", "Bearer supplied-token");
        return request;
    }

    @Test void rejectsInvalidTokenBeforeController() throws Exception {
        when(tokens.verifiedUsername("supplied-token")).thenThrow(new IllegalArgumentException());
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request(), response, chain);
        assertEquals(401, response.getStatus());
        verifyNoInteractions(chain, users);
    }

    @Test void rejectsSuspendedAccount() throws Exception {
        when(tokens.verifiedUsername("supplied-token")).thenReturn("client");
        when(users.loadUserByUsername("client")).thenReturn(User.withUsername("client").password("hash").roles("USER").disabled(true).build());
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request(), response, chain);
        assertEquals(401, response.getStatus());
        verifyNoInteractions(chain);
    }

    @Test void usesCurrentDatabaseRoleForPermissions() throws Exception {
        when(tokens.verifiedUsername("supplied-token")).thenReturn("client");
        when(users.loadUserByUsername("client")).thenReturn(User.withUsername("client").password("hash").roles("USER").build());
        MockHttpServletRequest request = request();
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, chain);
        assertEquals("ROLE_USER", SecurityContextHolder.getContext().getAuthentication().getAuthorities().iterator().next().getAuthority());
        verify(chain).doFilter(request, response);
    }
}
