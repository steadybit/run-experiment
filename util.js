exports.delay = async function delay(time, value) {
  return new Promise((resolve) => {
      setTimeout(resolve.bind(null, value), time);
  });
}