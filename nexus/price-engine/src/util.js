module.exports = {
  capitalise(str) {
    return str[0].toUpperCase() + str.slice(1)
  },
  
  objAssign(...values) {
    return Object.assign({}, ...values);
  }
}
