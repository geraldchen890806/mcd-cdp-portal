import React, { useState, useEffect } from 'react';
import { MDAI } from '@makerdao/dai-plugin-mcd';
import { Text, Input, Grid, Button } from '@makerdao/ui-components-core';
import Info from './shared/Info';
import InfoContainer from './shared/InfoContainer';
import useMaker from '../../hooks/useMaker';
import { calcCDPParams } from '../../utils/cdp';
import { subtract, greaterThan } from '../../utils/bignumber';
import useStore from 'hooks/useStore';
import useValidatedInput from 'hooks/useValidatedInput';
import useLanguage from 'hooks/useLanguage';
import useAnalytics from 'hooks/useAnalytics';
import {
  getCdp,
  getDebtAmount,
  getCollateralAmount,
  getCollateralPrice,
  getCollateralAvailableAmount
} from 'reducers/cdps';
import {
  formatCollateralizationRatio,
  formatLiquidationPrice,
  safeToFixed
} from '../../utils/ui';
import SetMax from 'components/SetMax';
import RatioDisplay, { RatioDisplayTypes } from 'components/RatioDisplay';

const Withdraw = ({ cdpId, reset }) => {
  const { trackBtnClick } = useAnalytics('Withdraw', 'Sidebar');
  const { lang } = useLanguage();
  const { maker, newTxListener } = useMaker();
  const [liquidationPrice, setLiquidationPrice] = useState(0);
  const [collateralizationRatio, setCollateralizationRatio] = useState(0);

  const [storeState] = useStore();
  const cdp = getCdp(cdpId, storeState);
  const { liquidationRatio } = cdp;
  const collateralAvailableAmount = getCollateralAvailableAmount(cdp, false);
  const collateralPrice = getCollateralPrice(cdp);
  const collateralAmount = getCollateralAmount(cdp, false);
  const debtAmount = getDebtAmount(cdp);

  const { symbol } = cdp.currency;

  const [amount, setAmount, onAmountChange, amountErrors] = useValidatedInput(
    '',
    {
      maxFloat: collateralAvailableAmount,
      minFloat: 0,
      isFloat: true
    },
    {
      maxFloat: () => lang.action_sidebar.cdp_below_threshold
    }
  );

  const setMax = () => setAmount(collateralAvailableAmount);
  const undercollateralized =
    amount && greaterThan(amount, collateralAvailableAmount);

  useEffect(() => {
    let val = parseFloat(amount);
    val = isNaN(val) ? 0 : val;
    const { liquidationPrice, collateralizationRatio } = calcCDPParams({
      ilkData: cdp,
      gemsToLock: subtract(collateralAmount, val),
      daiToDraw: debtAmount
    });
    setLiquidationPrice(liquidationPrice);
    setCollateralizationRatio(collateralizationRatio);
  }, [amount, cdp, collateralAmount, debtAmount]);

  const withdraw = () => {
    newTxListener(
      maker
        .service('mcd:cdpManager')
        .wipeAndFree(cdpId, cdp.ilk, MDAI(0), cdp.currency(amount)),
      lang.formatString(lang.transactions.withdrawing_gem, symbol)
    );
    reset();
  };
  return (
    <Grid gridRowGap="m">
      <Grid gridRowGap="s">
        <Text.h4 color="darkLavender">
          {lang.formatString(lang.action_sidebar.withdraw_title, symbol)}
        </Text.h4>
        <Text.p t="body">
          {lang.formatString(lang.action_sidebar.withdraw_description, symbol)}
        </Text.p>
        <Input
          type="number"
          placeholder={`0.00 ${symbol}`}
          value={amount}
          min="0"
          onChange={onAmountChange}
          after={
            parseFloat(debtAmount) === 0 ? (
              <SetMax
                onClick={() => {
                  setMax();
                  trackBtnClick('SetMax', {
                    collateralAvailableAmount,
                    setMax: true
                  });
                }}
              />
            ) : null
          }
          failureMessage={amountErrors}
        />
        <RatioDisplay
          type={RatioDisplayTypes.CARD}
          ratio={collateralizationRatio}
          ilkLiqRatio={liquidationRatio}
          text={lang.action_sidebar.withdraw_warning}
          onlyWarnings={true}
          show={amount !== '' && amount > 0 && !undercollateralized}
          textAlign="center"
        />
      </Grid>
      <Grid gridTemplateColumns="1fr 1fr" gridColumnGap="s">
        <Button
          disabled={!amount || amountErrors}
          onClick={() => {
            trackBtnClick('Confirm', { amount });
            withdraw();
          }}
        >
          {lang.actions.withdraw}
        </Button>
        <Button
          variant="secondary-outline"
          onClick={() => {
            trackBtnClick('Cancel');
            reset();
          }}
        >
          {lang.cancel}
        </Button>
      </Grid>
      <InfoContainer>
        <Info
          title={lang.action_sidebar.maximum_available_to_withdraw}
          body={`${safeToFixed(collateralAvailableAmount, 7)} ${symbol}`}
        />
        <Info
          title={lang.formatString(
            lang.action_sidebar.gem_usd_price_feed,
            symbol
          )}
          body={`${collateralPrice} ${symbol}/USD`}
        />
        <Info
          title={lang.action_sidebar.new_liquidation_price}
          body={formatLiquidationPrice(liquidationPrice, cdp.currency.symbol)}
        />
        <Info
          title={lang.action_sidebar.new_collateralization_ratio}
          body={
            <RatioDisplay
              type={RatioDisplayTypes.TEXT}
              ratio={collateralizationRatio}
              ilkLiqRatio={liquidationRatio}
              text={formatCollateralizationRatio(collateralizationRatio)}
              show={amount !== '' && amount > 0 && !undercollateralized}
            />
          }
        />
      </InfoContainer>
    </Grid>
  );
};
export default Withdraw;
