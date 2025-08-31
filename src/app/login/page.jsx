'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { jwtDecode } from 'jwt-decode';
import Button from '../../components/common/Button';
import PrivacyPolicyFooter from '../../components/common/PrivacyPolicyFooter';
import FooterNav from '../../components/common/FooterNav';
import { isValidPassword, strictEmailRegex } from '../../constants/regex';
import useTokenStore from '../../stores/useTokenStore';
import axiosInstance, { setAccessToken } from '../../libs/api/instance';
import { getLoginErrorMessage } from '../../utils/errorMessages';

function BottomSafeSpacer({ height = 64 }) {
  return (
    <div
      aria-hidden="true"
      style={{ height: `calc(${height}px + env(safe-area-inset-bottom, 0px))` }}
    />
  );
}

function LoginForm() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoginSave, setIsLoginSave] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');

  const router = useRouter();
  const searchParams = useSearchParams();
  const [redirectUrl, setRedirectUrl] = useState('/');

  const {
    setAccessToken: setGlobalAccessToken,
    setRefreshToken,
    setUserId,
  } = useTokenStore();

  useEffect(() => {
    const redirect = searchParams.get('redirect');
    if (redirect) {
      setRedirectUrl(decodeURIComponent(redirect));
    }

    // 저장된 로그인 정보 불러오기
    const savedLoginData = localStorage.getItem('savedLoginData');
    if (savedLoginData) {
      try {
        const {
          email: savedEmail,
          password: savedPassword,
          isLoginSave: savedIsLoginSave,
        } = JSON.parse(savedLoginData);
        if (savedIsLoginSave) {
          setEmail(savedEmail || '');
          setPassword(savedPassword || '');
          setIsLoginSave(true);
        }
      } catch (error) {
        console.error('저장된 로그인 정보를 불러오는 중 오류 발생:', error);
      }
    }
  }, [searchParams]);

  const handleLoginSave = () => {
    const newIsLoginSave = !isLoginSave;
    setIsLoginSave(newIsLoginSave);

    // 로그인 유지를 해제하면 저장된 정보 삭제
    if (!newIsLoginSave) {
      localStorage.removeItem('savedLoginData');
    }
  };

  const handlePasswordVisible = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  const isLoginAvailable = () =>
    strictEmailRegex.test(email) && isValidPassword(password);

  const handleLogin = async () => {
    try {
      const formData = new FormData();
      formData.append('email', email);
      formData.append('password', password);

      const response = await axiosInstance.post('/login', formData);

      const accessToken =
        response.headers['access'] ||
        response.headers['Access'] ||
        response.headers['authorization'] ||
        response.headers['Authorization'];

      const refreshToken =
        response.headers['refresh'] || response.headers['Refresh'];

      if (accessToken) {
        setAccessToken(accessToken);
        setGlobalAccessToken(accessToken);
        setRefreshToken(refreshToken || '');
        const decoded = jwtDecode(accessToken);
        console.log('토큰 디코드 결과:', decoded);

        // userId를 토큰에서 추출하여 설정
        const extractedUserId =
          decoded?.userId ??
          decoded?.id ??
          decoded?.uid ??
          decoded?.sub ??
          null;
        if (extractedUserId) {
          setUserId(extractedUserId);
        }

        // 로그인 성공 시 로그인 유지 옵션에 따라 정보 저장/삭제
        if (isLoginSave) {
          const loginData = {
            email,
            password,
            isLoginSave: true,
          };
          localStorage.setItem('savedLoginData', JSON.stringify(loginData));
        } else {
          localStorage.removeItem('savedLoginData');
        }

        // 토큰과 userId 설정이 완료된 후 리다이렉트
        setTimeout(() => {
          router.push(redirectUrl);
        }, 50);
      } else {
        // 디버깅용 로그
        console.warn(
          '응답 헤더에서 access 토큰을 찾지 못했습니다:',
          response.headers,
        );
        setConfirmError('로그인에 실패했습니다. 토큰이 누락되었습니다.');
      }
    } catch (e) {
      console.error('로그인 실패:', e);
      setConfirmError(getLoginErrorMessage(e));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 본문 */}
      <div className="flex-1 px-6 py-8">
        <div className="text-center space-y-3 mb-8">
          <h1 className="text-2xl font-bold text-[#788cff] tracking-tight">
            띵스룸
          </h1>
          <div className="text-[#73726e] text-sm leading-relaxed">
            <p>명지대학교 이메일로 가입하여</p>
            <p>스터디룸을 간편히 사용해요!</p>
          </div>
        </div>

        <div className="max-w-md mx-auto w-full space-y-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#37352f]">
                이메일
              </label>
              <StyledEmailInput
                type="email"
                id="email"
                value={email}
                onChange={(e) => {
                  const inputEmail = e.target.value;
                  setEmail(inputEmail);
                  if (inputEmail === '' || strictEmailRegex.test(inputEmail)) {
                    setEmailError('');
                  } else {
                    setEmailError('학교 이메일을 입력해주세요. (@mju.ac.kr)');
                  }
                }}
                placeholder="학교 이메일을 입력해주세요."
                setEmail={setEmail}
              />
              {emailError && (
                <p className="text-red-500 text-xs mt-1.5">{emailError}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#37352f]">
                비밀번호
              </label>
              <StyledPasswordInput
                id="password"
                value={password}
                onChange={(e) => {
                  const pw = e.target.value;
                  setPassword(pw);
                  if (!isValidPassword(pw)) {
                    setPasswordError(
                      '비밀번호는 8자 이상, 영문과 숫자, 특수문자를 포함해야합니다.',
                    );
                  } else {
                    setPasswordError('');
                  }
                }}
                placeholder="비밀번호를 입력해주세요."
                isVisible={isPasswordVisible}
                handlePasswordVisible={handlePasswordVisible}
              />
              {passwordError && (
                <p className="text-red-500 text-xs mt-1.5">{passwordError}</p>
              )}
              {confirmError && (
                <p className="text-red-500 text-xs mt-1.5">{confirmError}</p>
              )}
            </div>
          </form>

          <div className="flex items-center justify-between">
            <StyledCheckbox checked={isLoginSave} onChange={handleLoginSave}>
              로그인 유지
            </StyledCheckbox>

            <div className="flex items-center gap-4 text-xs text-[#73726e]">
              <Link
                href="/login/sign-up-step1"
                className="hover:text-[#37352f] transition-colors"
              >
                회원가입
              </Link>
              <Link
                href="/login/reset-password-step1"
                className="hover:text-[#37352f] transition-colors"
              >
                비밀번호 재설정
              </Link>
            </div>
          </div>

          <Button
            disabled={!isLoginAvailable()}
            text="로그인"
            type="submit"
            onClick={handleLogin}
          />
        </div>
      </div>

      <PrivacyPolicyFooter />
      <BottomSafeSpacer height={64} />
      <FooterNav />
    </div>
  );
}

const StyledInput = ({ value, ...props }) => {
  return (
    <input
      className="w-full px-4 py-3 bg-white rounded-lg border border-[#e9e9e7] text-sm placeholder:text-[#9b9998] focus:outline-none focus:border-[#788cff] focus:ring-2 focus:ring-[#788cff]/10 transition-all duration-200"
      value={value}
      {...props}
    />
  );
};

const StyledEmailInput = ({ value, setEmail, ...props }) => {
  const handleRemoveEmailValue = () => {
    setEmail('');
  };

  return (
    <div className="relative">
      <StyledInput {...props} value={value} />
      {value && (
        <button
          type="button"
          onClick={handleRemoveEmailValue}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-md transition-colors"
        >
          <img
            src="/static/icons/x_icon.svg"
            alt="Clear"
            width={14}
            height={14}
            className="opacity-60 hover:opacity-80"
          />
        </button>
      )}
    </div>
  );
};

const StyledPasswordInput = ({
  value,
  isVisible = false,
  handlePasswordVisible,
  ...props
}) => {
  return (
    <div className="relative">
      <StyledInput
        {...props}
        value={value}
        type={isVisible ? 'text' : 'password'}
      />
      <button
        type="button"
        onClick={handlePasswordVisible}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-md transition-colors"
      >
        <img
          src={
            isVisible
              ? '/static/icons/eye_on_icon.svg'
              : '/static/icons/eye_off_icon.svg'
          }
          alt="Toggle Password Visibility"
          width={18}
          height={18}
          className="opacity-60 hover:opacity-80"
        />
      </button>
    </div>
  );
};

const StyledCheckbox = ({ onChange, children, ...props }) => {
  return (
    <label className="inline-flex items-center cursor-pointer group">
      <div className="relative">
        <input
          type="checkbox"
          checked={props.checked}
          onChange={onChange}
          className="appearance-none w-5 h-5 focus:outline-none"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <img
            src={
              props.checked
                ? '/static/icons/check_off_icon.svg'
                : '/static/icons/check_on_icon.svg'
            }
            alt="Checkbox"
            width={20}
            height={20}
            className="group-hover:opacity-80 transition-opacity"
          />
        </div>
      </div>
      <span className="ml-2 text-xs text-[#73726e] select-none">
        {children}
      </span>
    </label>
  );
};

export default function Login() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
