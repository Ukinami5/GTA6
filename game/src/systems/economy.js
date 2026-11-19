import { BALANCE } from '../config.js';

let cash = BALANCE.cash;
export const getCash = () => cash;
export function addCash(amount) {
  if (Number.isFinite(amount) && amount > 0) cash += Math.round(amount);
  return cash;
}
export function removeCash(amount) {
  if (Number.isFinite(amount) && amount > 0) cash = Math.max(0, cash - Math.round(amount));
  return cash;
}
