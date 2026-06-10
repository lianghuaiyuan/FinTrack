import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import Login from '../pages/Login';
import React from 'react';

const renderLogin = () => {
  return render(
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('Login Page', () => {
  it('renders login form', () => {
    renderLogin();
    expect(screen.getByText('财迹 FinTrack')).toBeTruthy();
    expect(screen.getByPlaceholderText('请输入用户名')).toBeTruthy();
    expect(screen.getByPlaceholderText('请输入密码')).toBeTruthy();
    expect(screen.getByRole('button', { name: /登录/ })).toBeTruthy();
  });

  it('shows register link', () => {
    renderLogin();
    expect(screen.getByText('立即注册')).toBeTruthy();
  });

  it('shows error when username empty', async () => {
    renderLogin();
    const btn = screen.getByRole('button', { name: /登录/ });
    fireEvent.click(btn);
    await waitFor(() => {
      expect(screen.getByText('请输入用户名')).toBeTruthy();
    });
  });

  it('shows error when password empty', async () => {
    renderLogin();
    const input = screen.getByPlaceholderText('请输入用户名');
    await userEvent.type(input, 'testuser');
    const btn = screen.getByRole('button', { name: /登录/ });
    fireEvent.click(btn);
    await waitFor(() => {
      expect(screen.getByText('请输入密码')).toBeTruthy();
    });
  });
});
