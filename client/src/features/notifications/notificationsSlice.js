import { createSlice } from '@reduxjs/toolkit';
const s=createSlice({name:'notifications',initialState:{items:[],unread:0},reducers:{setNotifications:(st,a)=>{st.items=a.payload;},setUnread:(st,a)=>{st.unread=a.payload;}}});
export const {setNotifications,setUnread}=s.actions; export default s.reducer;
