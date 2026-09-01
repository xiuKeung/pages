/* 模块 1：由原 index.html 内联脚本迁移。 */
window.calculateViewingLoan = ({ targetPrice, downPaymentRate, commercialRate, loanYears }) => {
    const number = value => Number(value || 0);
    const price = number(targetPrice) * 10000;
    const downPayment = Math.min(100, Math.max(0, number(downPaymentRate)));
    const monthlyRate = Math.max(0, number(commercialRate)) / 100 / 12;
    const months = Math.max(1, number(loanYears) * 12);
    const loan = price * (1 - downPayment / 100);
    if (!price || !loan) return null;
    const monthlyPrincipal = loan / months;
    const equalPayment = monthlyRate
      ? loan * monthlyRate * (1 + monthlyRate) ** months / ((1 + monthlyRate) ** months - 1)
      : monthlyPrincipal;
    return {
      price,
      downPaymentAmount: price - loan,
      loan,
      equalPayment,
      firstPrincipalPayment: monthlyPrincipal + loan * monthlyRate,
      lastPrincipalPayment: monthlyPrincipal + monthlyPrincipal * monthlyRate
    };
  };
