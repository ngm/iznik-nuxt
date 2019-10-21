import Vue from 'vue'
import Moment from 'dayjs'

function earliestDate(dates) {
  // Find the earliest date which is in the future.
  const now = new Date().getTime()
  let earliest = null
  let earliestDate = null

  for (let i = 0; i < dates.length; i++) {
    const atime = new Date(dates[i].start).getTime()
    if (atime >= now && (!earliest || atime < earliest)) {
      earliest = atime
      earliestDate = dates[i]

      if (
        new Moment().diff(earliestDate.end) < 0 ||
        new Moment().isSame(earliestDate.end, 'day')
      ) {
        const startm = new Moment(earliestDate.start)
        let endm = new Moment(earliestDate.end)
        endm = endm.isSame(startm, 'day')
          ? endm.format('HH:mm')
          : endm.format('ddd, Do MMM HH:mm')

        earliestDate.string = {
          start: startm.format('ddd, Do MMM HH:mm'),
          end: endm
        }
      }
    }
  }

  return earliestDate
}

export const state = () => ({
  // Use object not array otherwise we end up with a huge sparse array which hangs the browser when saving to local
  // storage.
  list: {}
})

export const mutations = {
  add(state, item) {
    item.earliestDate = earliestDate(item.dates)
    Vue.set(state.list, item.id, item)
  },

  addAll(state, items) {
    items.forEach(item => {
      item.earliestDate = earliestDate(item.dates)
      Vue.set(state.list, item.id, item)
    })
  },

  setList(state, list) {
    state.list = {}

    if (list) {
      for (const item of list) {
        item.earliestDate = earliestDate(item.dates)
        Vue.set(state.list, item.id, item)
      }
    }
  },

  setContext(state, params) {
    console.log('Set context', params.ctx)
    state.context = params.ctx
  }
}

export const getters = {
  get: state => id => {
    let ret = null

    Object.keys(state.list).forEach(key => {
      const item = state.list[key]

      if (parseInt(key) === parseInt(id)) {
        ret = item
      }
    })

    return ret
  },

  list: state => () => {
    return state.list
  },

  sortedList: state => () => {
    const k = Object.values(state.list)
    return k.sort(function(a, b) {
      if (a.earliestDate && b.earliestDate) {
        return (
          new Date(a.earliestDate.start).getTime() -
          new Date(b.earliestDate.start).getTime()
        )
      } else {
        return a.id - b.id
      }
    })
  },

  getContext: state => () => {
    let ret = null

    if (state.context && state.context.end) {
      ret = state.context
    }

    return ret
  }
}

export const actions = {
  async fetch({ commit }, params) {
    const res = await this.$axios.get(process.env.API + '/communityevent', {
      params: params
    })

    if (res.status === 200) {
      commit('addAll', res.data.communityevents)
      commit('setContext', {
        ctx: res.data.context
      })
    }
  },
  clear({ commit }) {
    commit('setContext', {
      ctx: null
    })

    commit('setList', [])
  }
}
