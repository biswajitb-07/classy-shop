import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  vendor: null,
  isAuthenticated: false,
  isOpen: false,
};

const authSlice = createSlice({
  name: "authSlice",
  initialState,
  reducers: {
    userLoggedIn: (state, action) => {
      state.vendor = action.payload.vendor;
      state.isAuthenticated = true;
    },
    userLoggedOut: (state) => {
      state.vendor = null;
      state.isAuthenticated = false;
    },
    toggleSidebar: (state) => {
      state.isOpen = !state.isOpen;
    },
    setSidebarOpen: (state, action) => {
      state.isOpen = Boolean(action.payload);
    },
  },
});

export const { userLoggedIn, userLoggedOut, toggleSidebar, setSidebarOpen } =
  authSlice.actions;

export default authSlice.reducer;
