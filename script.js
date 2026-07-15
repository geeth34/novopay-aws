"use strict";

// BANKIST APP

// Elements
const labelWelcome = document.querySelector(".welcome");
const labelDate = document.querySelector(".date");
const labelBalance = document.querySelector(".balance__value");
const labelSumIn = document.querySelector(".summary__value--in");
const labelSumOut = document.querySelector(".summary__value--out");
const labelSumInterest = document.querySelector(".summary__value--interest");
const labelTimer = document.querySelector(".timer");

const containerApp = document.querySelector(".app");
const containerMovements = document.querySelector(".movements");

const btnLogin = document.querySelector(".login__btn");
const btnTransfer = document.querySelector(".form__btn--transfer");
const btnLoan = document.querySelector(".form__btn--loan");
const btnClose = document.querySelector(".form__btn--close");
const btnSort = document.querySelector(".btn--sort");

const inputLoginUsername = document.querySelector(".login__input--user");
const inputLoginPin = document.querySelector(".login__input--pin");
const inputTransferTo = document.querySelector(".form__input--to");
const inputTransferAmount = document.querySelector(".form__input--amount");
const inputLoanAmount = document.querySelector(".form__input--loan-amount");
const inputCloseUsername = document.querySelector(".form__input--user");
const inputClosePin = document.querySelector(".form__input--pin");
const introBox = document.querySelector(".details");
const errorMsg = document.querySelector(".error");

let currentAccount,
  timer,
  sorted = false;

// FUNCTIONS

// format movement dates in the accounts
const formatMovementDate = (date, locale) => {
  const calcDaysPassed = (date1, date2) =>
    Math.round(Math.abs(date2 - date1) / (1000 * 60 * 60 * 24));

  // number of days passed between the current and movement date
  const daysPassed = calcDaysPassed(new Date(), date);

  // display the transfer date
  if (daysPassed === 0) return "Today";
  if (daysPassed === 1) return "Yesterday";
  if (daysPassed <= 7) return `${daysPassed} days ago`;
  else return new Intl.DateTimeFormat(locale).format(date);
};

// format amount and currency based on the locale of each account
// this is a generic function to format numbers
const formatAmount = (value, locale, currency) => {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
  }).format(value);
};

// display transactions
const displayMovements = function (acc, sort = false) {
  containerMovements.innerHTML = "";

  // if sort = true, sort movements in descending order of the amounts
  const movemts = sort
    ? acc.movements.slice().sort((a, b) => a - b)
    : acc.movements;
  movemts.forEach(function (mov, i) {
    // movement type
    const type = mov > 0 ? "deposit" : "withdrawal";

    const date = new Date(acc.movementsDates[i]);
    const displayDate = formatMovementDate(date, acc.locale);
    const formattedMovement = formatAmount(mov, acc.locale, acc.currency);
    const html = `
            <div class="movements__row">
                <div class="movements__type movements__type--${type}">${i + 1} ${type}</div>
                <div class="movements__date">${displayDate}</div>
                <div class="movements__value">${formattedMovement}</div>
            </div>`;
    containerMovements.insertAdjacentHTML("afterbegin", html);
  });
};

const calcDisplayBalance = (acc) => {
  acc.balance = acc.movements.reduce((acc, mov) => acc + mov, 0);
  labelBalance.textContent = formatAmount(
    acc.balance,
    acc.locale,
    acc.currency,
  );
};

const calcDisplaySummary = (acc) => {
  // total deposits : IN
  const incomes = acc.movements
    .filter((mov) => mov > 0)
    .reduce((acc, mov) => acc + mov, 0);
  labelSumIn.textContent = formatAmount(incomes, acc.locale, acc.currency);

  // total withdrawals : OUT
  const out = acc.movements
    .filter((mov) => mov < 0)
    .reduce((acc, mov) => acc + mov, 0);
  labelSumOut.textContent = formatAmount(
    Math.abs(out),
    acc.locale,
    acc.currency,
  );

  // total interest amount : INTEREST
  // for every deposit >= 1, 1.2% of it is paid out as interest
  const interest = acc.movements
    .filter((mov) => mov > 0)
    .map((deposit) => deposit * acc.interestRate)
    .filter((deposit) => deposit >= 1)
    .reduce((acc, int) => acc + int, 0);
  labelSumInterest.textContent = formatAmount(
    interest,
    acc.locale,
    acc.currency,
  );
};

const updateUI = (acc) => {
  // display movements, balance, transaction summary
  displayMovements(acc);
  calcDisplayBalance(acc);
  calcDisplaySummary(acc);
};

// creating a logout timer
// the app will log out users after some time of inactivity on the account
const startLogoutTimer = () => {
  let time = 600;
  const tick = () => {
    const min = String(Math.trunc(time / 60)).padStart(2, 0);
    const sec = String(Math.trunc(time % 60)).padStart(2, 0);

    // display the time that is remaining
    labelTimer.textContent = `${min}:${sec}`;
    // timer expires at '0'
    if (time === 0) {
      clearInterval(timer);
      // updating the UI
      labelWelcome.textContent = "Log in to get started";
      containerApp.style.opacity = 0;
    }
    time--;
  };
  tick();

  // call the timer every second
  const timer = setInterval(tick, 1000);
  return timer;
};

// EVENT HANDLERS0 — using fetch() to call Flask API

// LOGIN
btnLogin.addEventListener("click", async (e) => {
  e.preventDefault();

  const response = await fetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: inputLoginUsername.value,
      pin: Number(inputLoginPin.value),
    }),
  });

  if (!response.ok) {
    errorMsg.classList.remove("hidden");
    return;
  }

  const data = await response.json();
  currentAccount = data;

  // update UI
  introBox.classList.add("hidden");
  errorMsg.classList.add("hidden");
  // display login messsage and app data
  labelWelcome.textContent = `Welcome back, ${currentAccount.owner.split(" ")[0]}`;
  containerApp.style.opacity = 100;

  // creating current date and time
  const now = new Date(); // generates the date user has logged in
  const options = {
    hour: "numeric",
    minute: "numeric",
    day: "numeric",
    month: "numeric",
    year: "numeric",
  };

  // display current date, time and account balance using Internationalisation API
  labelDate.textContent = new Intl.DateTimeFormat(
    currentAccount.locale,
    options,
  ).format(now);

  // clear input fields after log in
  inputLoginUsername.value = inputLoginPin.value = "";

  // remove focus from the input field
  inputLoginPin.blur();

  if (timer) clearInterval(timer);
  // restart the timer
  timer = startLogoutTimer();

  updateUI(currentAccount);
});

// TRANSFER
btnTransfer.addEventListener("click", async (e) => {
  e.preventDefault();

  // amount to be transferred
  const amount = Number(inputTransferAmount.value);
  // account receiving the transfer
  const toUsername = inputTransferTo.value;

  inputTransferAmount.value = inputTransferTo.value = "";

  const response = await fetch("/transfer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      from_username: currentAccount.username,
      to_username: toUsername,
      amount: amount,
    }),
  });

  if (!response.ok) return;

  const data = await response.json();
  currentAccount.balance = data.balance;
  currentAccount.movements = data.movements;
  currentAccount.movementsDates = data.movementsDates;

  updateUI(currentAccount);
  clearInterval(timer);
  timer = startLogoutTimer();
});

// LOAN
btnLoan.addEventListener("click", async (e) => {
  e.preventDefault();

  const amount = Math.floor(inputLoanAmount.value);
  inputLoanAmount.value = "";

  setTimeout(async () => {
    const response = await fetch("/loan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: currentAccount.username,
        amount: amount,
      }),
    });

    if (!response.ok) return;

    const data = await response.json();
    currentAccount.balance = data.balance;
    currentAccount.movements = data.movements;
    currentAccount.movementsDates = data.movementsDates;

    updateUI(currentAccount);
    clearInterval(timer);
    timer = startLogoutTimer();
  }, 8000);
});

// CLOSE ACCOUNT
btnClose.addEventListener("click", async (e) => {
  e.preventDefault();

  const response = await fetch("/close", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: inputCloseUsername.value,
      pin: Number(inputClosePin.value),
    }),
  });

  if (!response.ok) return;

  // update UI
  containerApp.style.opacity = 0;
  labelWelcome.textContent = "Log in to get started";
  inputCloseUsername.value = inputClosePin.value = "";
});

// SORT
btnSort.addEventListener("click", (e) => {
  e.preventDefault();
  displayMovements(currentAccount, !sorted);
  sorted = !sorted;
});
