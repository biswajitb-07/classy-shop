import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  deliveryPartner: null,
  isAuthenticated: false,
  isOpen: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    userLoggedIn: (state, action) => {
      state.deliveryPartner = action.payload.deliveryPartner;
      state.isAuthenticated = true;
    },
    userLoggedOut: (state) => {
      state.deliveryPartner = null;
      state.isAuthenticated = false;
      state.isOpen = false;
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
