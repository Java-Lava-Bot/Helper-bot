const { Schema, model } = require("mongoose");

const VoteReminderSchema = new Schema(
  {
    Guild: { type: String, required: true, unique: true },
    ChannelId: { type: String, required: true },
    RoleId: { type: String, default: null },
    // Absolute timestamp (ms) of when the next reminder should fire.
    // null when there's no pending reminder (fresh setup, never voted yet).
    NextReminderAt: { type: Number, default: null },
  },
  { timestamps: true }
);

module.exports = model("VoteReminder", VoteReminderSchema);
