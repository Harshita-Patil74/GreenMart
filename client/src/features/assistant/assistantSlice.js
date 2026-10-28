import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import assistantApi from "../../api/assistantApi";

export const askAssistant = createAsyncThunk("assistant/chat", async ({ message, history }, { rejectWithValue }) => {
  try {
    const { data } = await assistantApi.chat({ message, history });
    return data;
  } catch (e) {
    return rejectWithValue(e);
  }
});

const s = createSlice({
  name: "assistant",
  initialState: { messages: [], loading: false, error: null },
  reducers: {
    addMessage: (st, a) => { st.messages.push(a.payload); },
    clear: (st) => { st.messages = []; st.error = null; },
  },
  extraReducers: (b) => {
    b.addCase(askAssistant.pending, (s) => { s.loading = true; s.error = null; })
     .addCase(askAssistant.fulfilled, (s, a) => { s.loading = false; s.messages.push({ role: "assistant", text: a.payload.reply, products: a.payload.products || [] }); })
     .addCase(askAssistant.rejected, (s, a) => { s.loading = false; s.error = a.payload; });
  },
});

export const { addMessage, clear } = s.actions;
export default s.reducer;