import api from './api';

export const updateProfile = async (data) => {
  const res = await api.patch('/api/users/me', data);
  return res.data.data.user;
};

export const changePassword = async ({ currentPassword, newPassword }) => {
  const res = await api.patch('/api/users/me/password', {
    currentPassword,
    newPassword,
  });
  return res.data;
};
