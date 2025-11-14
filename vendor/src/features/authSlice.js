import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  vendor: null,
  isAuthenticated: false,
  isOpen: true,
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
  },
});

export const { userLoggedIn, userLoggedOut, toggleSidebar } =
  authSlice.actions;

export default authSlice.reducer;
