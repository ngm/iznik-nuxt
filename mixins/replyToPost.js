import waitForRef from '@/mixins/waitForRef'
import breakpoints from '@/mixins/breakpoints'

export default {
  mixins: [waitForRef, breakpoints],
  computed: {
    replyToSend() {
      // This is here because we can arrive back at the site after a login which was triggered because we were
      // trying to reply.
      const me = this.$store.getters['auth/user']

      if (me) {
        const ret = this.$store.getters['reply/get']

        if (
          ret &&
          ret.replyingAt &&
          Date.now() - ret.replyingAt < 24 * 60 * 60 * 1000 &&
          ret.replyMessage &&
          ret.replyMsgId
        ) {
          // We have a fairly recent reply to send.  Don't want to send old replies which somehow get stuck in
          // local storage.
          return ret
        }
      }

      return null
    },
    replyToUser() {
      if (this.replyToSend) {
        const msg = this.$store.getters['messages/get'](
          this.replyToSend.replyMsgId
        )

        if (msg && msg.fromuser) {
          return msg.fromuser.id
        }
      }

      return null
    }
  },
  methods: {
    replyToPost() {
      // We have different buttons which display at different screen sizes.  Which of those is visible and hence
      // clicked tells us whether we want to open this chat in a popup or not.
      console.log('Execute reply to post', this.replyToSend)
      const popup = this.sm()

      // Create the chat and send the first message.
      this.waitForRef('replyToPostChatButton', () => {
        console.log(
          'Now open chat',
          this.replyToSend.replyMessage,
          this.replyToSend.replyMsgId,
          this.replyToUser,
          popup
        )

        // Open the chat, which will send the message.  We will either end up with a popup chat, or go to the
        // chat page.
        this.$refs.replyToPostChatButton.openChat(
          null,
          this.replyToSend.replyMessage,
          this.replyToSend.replyMsgId,
          popup,
          true
        )
      })
    },
    async sentReply() {
      // This gets invoked when we have sent the message we passed to ChatButton.
      this.replying = false

      // Clear message now sent
      await this.$store.dispatch('reply/set', {
        replyMsgId: null,
        replyMessage: null,
        replyingAt: Date.now()
      })
    }
  }
}
