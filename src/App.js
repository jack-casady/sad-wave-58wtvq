import React, { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// --- 1. HELPER COMPONENTS (MOVED OUTSIDE TO FIX SLIDING) ---

const Slider = ({
  label,
  value,
  setValue,
  min,
  max,
  step,
  format,
  description,
}) => (
  <div style={{ marginBottom: "28px" }}>
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        marginBottom: "8px",
      }}
    >
      <label style={{ fontSize: "14px", fontWeight: "600", color: "#1a365d" }}>
        {label}
      </label>
      <span style={{ fontSize: "20px", fontWeight: "700", color: "#c9a227" }}>
        {format ? format(value) : value}
      </span>
    </div>
    {description && (
      <p style={{ fontSize: "13px", color: "#718096", marginBottom: "8px" }}>
        {description}
      </p>
    )}
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => setValue(Number(e.target.value))}
      style={{
        width: "100%",
        height: "8px",
        borderRadius: "4px",
        background:
          "linear-gradient(to right, #c9a227 0%, #c9a227 " +
          ((value - min) / (max - min)) * 100 +
          "%, #e2e8f0 " +
          ((value - min) / (max - min)) * 100 +
          "%, #e2e8f0 100%)",
        appearance: "none",
        cursor: "pointer",
        outline: "none",
      }}
    />
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        marginTop: "4px",
      }}
    >
      <span style={{ fontSize: "12px", color: "#718096" }}>
        {format ? format(min) : min}
      </span>
      <span style={{ fontSize: "12px", color: "#718096" }}>
        {format ? format(max) : max}
      </span>
    </div>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          padding: "12px 16px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        }}
      >
        <p style={{ fontWeight: "600", color: "#1a365d", marginBottom: "8px" }}>
          Age {payload[0]?.payload?.age}
        </p>
        <p style={{ color: "#718096", fontSize: "14px", marginBottom: "4px" }}>
          60/40 Approach: {formatCurrency(payload[0]?.value || 0)}
        </p>
        <p style={{ color: "#c9a227", fontSize: "14px", marginBottom: "4px" }}>
          Equity Approach: {formatCurrency(payload[1]?.value || 0)}
        </p>
        <p
          style={{
            color: "#1a365d",
            fontSize: "14px",
            borderTop: "1px dashed #e2e8f0",
            paddingTop: "4px",
            marginTop: "4px",
          }}
        >
          What You Need: {formatCurrency(payload[2]?.value || 0)}
        </p>
      </div>
    );
  }
  return null;
};

// --- 2. MATH HELPERS (MOVED OUTSIDE) ---

function calculateFutureValue(principal, monthlyAdd, annualRate, years) {
  const monthlyRate = annualRate / 12;
  const months = years * 12;
  const fvPrincipal = principal * Math.pow(1 + annualRate, years);
  let fvContributions = 0;
  if (monthlyRate > 0 && monthlyAdd > 0) {
    fvContributions =
      monthlyAdd * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
  }
  return fvPrincipal + fvContributions;
}

function calculateRequiredMonthly(principal, goalAmount, annualRate, years) {
  const monthlyRate = annualRate / 12;
  const months = years * 12;
  const fvPrincipal = principal * Math.pow(1 + annualRate, years);
  const neededFromContributions = goalAmount - fvPrincipal;
  if (neededFromContributions <= 0) return 0;
  const pmt =
    (neededFromContributions * monthlyRate) /
    (Math.pow(1 + monthlyRate, months) - 1);
  return Math.max(0, pmt);
}

const formatCurrency = (value) => {
  if (value >= 1000000) {
    return "$" + (value / 1000000).toFixed(2) + "M";
  }
  if (value >= 1000) {
    return "$" + Math.round(value / 1000).toLocaleString() + "K";
  }
  return "$" + Math.round(value).toLocaleString();
};

const formatAxisValue = (value) => {
  if (value >= 1000000) {
    return "$" + (value / 1000000).toFixed(1) + "M";
  }
  if (value >= 1000) {
    return "$" + Math.round(value / 1000) + "K";
  }
  return "$" + value;
};

// --- 3. MAIN COMPONENT ---

export default function GPSRetirementCalculator() {
  const [step, setStep] = useState(0);

  // User inputs
  const [currentAge, setCurrentAge] = useState(45);
  const [retirementAge, setRetirementAge] = useState(65);
  const [currentPortfolio, setCurrentPortfolio] = useState(250000);
  const [monthlyContribution, setMonthlyContribution] = useState(1500);
  const [annualIncomeNeeded, setAnnualIncomeNeeded] = useState(80000);

  // Allocation question
  const [allocationReason, setAllocationReason] = useState(null);

  // Email capture
  const [email, setEmail] = useState("");
  const [showEmailCapture, setShowEmailCapture] = useState(false);
  const [emailStatus, setEmailStatus] = useState("idle"); // 'idle', 'sending', 'success', 'error'

  // Colors
  const navy = "#1a365d";
  const gold = "#c9a227";
  const cream = "#f7f5f0";
  const gray = "#718096";
  const grayLight = "#e2e8f0";
  const white = "#ffffff";
  const red = "#c53030";
  const green = "#276749";

  // GPS Assumptions
  const INFLATION = 0.03;
  const WITHDRAWAL_RATE = 0.045;
  const CONTINGENCY_MONTHS = 12;
  const RETURN_BB_EQUITY = 0.1;
  const RETURN_60_40 = 0.07;

  const yearsToRetirement = retirementAge - currentAge;

  const results = useMemo(() => {
    const inflationAdjustedIncome =
      annualIncomeNeeded * Math.pow(1 + INFLATION, yearsToRetirement);
    const capitalForWithdrawals = inflationAdjustedIncome / WITHDRAWAL_RATE;
    const cashContingency = inflationAdjustedIncome * (CONTINGENCY_MONTHS / 12);
    const totalCapitalNeeded = capitalForWithdrawals + cashContingency;

    const futureValue6040 = calculateFutureValue(
      currentPortfolio,
      monthlyContribution,
      RETURN_60_40,
      yearsToRetirement
    );
    const futureValueEquity = calculateFutureValue(
      currentPortfolio,
      monthlyContribution,
      RETURN_BB_EQUITY,
      yearsToRetirement
    );

    const gap6040 = totalCapitalNeeded - futureValue6040;
    const gapEquity = totalCapitalNeeded - futureValueEquity;
    const onTrack6040 = futureValue6040 >= totalCapitalNeeded;
    const onTrackEquity = futureValueEquity >= totalCapitalNeeded;

    const requiredMonthly6040 = calculateRequiredMonthly(
      currentPortfolio,
      totalCapitalNeeded,
      RETURN_60_40,
      yearsToRetirement
    );
    const requiredMonthlyEquity = calculateRequiredMonthly(
      currentPortfolio,
      totalCapitalNeeded,
      RETURN_BB_EQUITY,
      yearsToRetirement
    );
    const equitySurplus = futureValueEquity - totalCapitalNeeded;

    const calculateGoalTrajectory = (year) => {
      if (year === 0) return currentPortfolio;
      if (year === yearsToRetirement) return totalCapitalNeeded;
      if (currentPortfolio <= 1000) {
        return (
          currentPortfolio +
          (totalCapitalNeeded - currentPortfolio) * (year / yearsToRetirement)
        );
      }
      const impliedRate =
        Math.pow(totalCapitalNeeded / currentPortfolio, 1 / yearsToRetirement) -
        1;
      return currentPortfolio * Math.pow(1 + impliedRate, year);
    };

    const chartData = [];
    for (let y = 0; y <= yearsToRetirement; y++) {
      const age = currentAge + y;
      const val6040 = calculateFutureValue(
        currentPortfolio,
        monthlyContribution,
        RETURN_60_40,
        y
      );
      const valEquity = calculateFutureValue(
        currentPortfolio,
        monthlyContribution,
        RETURN_BB_EQUITY,
        y
      );
      const goalTrajectory = calculateGoalTrajectory(y);

      chartData.push({
        year: y,
        age: age,
        traditional: Math.round(val6040),
        equity: Math.round(valEquity),
        goal: Math.round(goalTrajectory),
      });
    }

    return {
      inflationAdjustedIncome,
      capitalForWithdrawals,
      cashContingency,
      totalCapitalNeeded,
      futureValue6040,
      futureValueEquity,
      gap6040,
      gapEquity,
      onTrack6040,
      onTrackEquity,
      requiredMonthly6040,
      requiredMonthlyEquity,
      equitySurplus,
      chartData,
    };
  }, [
    currentAge,
    retirementAge,
    currentPortfolio,
    monthlyContribution,
    annualIncomeNeeded,
    yearsToRetirement,
  ]);

  // Load Example Function
  const loadExample = () => {
    setCurrentAge(50);
    setRetirementAge(67);
    setCurrentPortfolio(750000);
    setMonthlyContribution(2500);
    setAnnualIncomeNeeded(120000);
  };

  // Submit email to HubSpot
  const submitToHubSpot = async () => {
    if (!email || !email.includes("@")) {
      setEmailStatus("invalid");
      return;
    }

    setEmailStatus("sending");

    const resultsSummary = `GPS Calculator Results
Age: ${currentAge} | Retirement Age: ${retirementAge}
Current Portfolio: ${formatCurrency(currentPortfolio)}
Monthly Contribution: ${formatCurrency(monthlyContribution)}
Income Goal: ${formatCurrency(annualIncomeNeeded)}/year
Total Capital Needed: ${formatCurrency(results.totalCapitalNeeded)}
60/40 Result: ${formatCurrency(results.futureValue6040)} - ${
      results.onTrack6040
        ? "ON TRACK"
        : "SHORT by " + formatCurrency(Math.abs(results.gap6040))
    }
Equity Result: ${formatCurrency(results.futureValueEquity)} - ${
      results.onTrackEquity
        ? "ON TRACK with " + formatCurrency(results.equitySurplus) + " surplus"
        : "SHORT by " + formatCurrency(Math.abs(results.gapEquity))
    }
Difference: ${formatCurrency(
      results.futureValueEquity - results.futureValue6040
    )} more with equity approach`;

    const hubspotData = {
      fields: [
        { name: "email", value: email },
        { name: "gps_calc_results", value: resultsSummary },
      ],
      context: {
        pageUri: window.location.href,
        pageName: "GPS Retirement Calculator",
      },
    };

    try {
      const response = await fetch(
        "https://api.hsforms.com/submissions/v3/integration/submit/20287694/29ed8f1c-40eb-4f27-83bc-b87b9a996110",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(hubspotData),
        }
      );

      if (response.ok) {
        setEmailStatus("success");
      } else {
        const errorText = await response.text();
        console.error("HubSpot error:", response.status, errorText);
        setEmailStatus("error");
      }
    } catch (err) {
      console.error("Submission error:", err);
      setEmailStatus("error");
    }
  };

  const reasonMessages = {
    advisor:
      "Your advisor likely recommended this to reduce volatility. But volatility is not the enemy. Running out of money is.",
    targetDate:
      "Target-date funds get more conservative as you age. That might feel safe, but it is costing you growth when you need it most.",
    safe: "Playing it safe has a cost. Over long periods, that cost compounds into a meaningful gap between where you are and where you need to be.",
    unsure:
      "Most people end up in a 60/40 allocation by default. But your retirement should not be left to defaults.",
  };

  // Step 0: Intro
  if (step === 0) {
    return (
      <Layout>
        <div
          style={{ textAlign: "center", maxWidth: "640px", margin: "0 auto" }}
        >
          <div
            style={{
              display: "inline-block",
              padding: "8px 16px",
              backgroundColor: "rgba(201,162,39,0.15)",
              border: "1px solid " + gold,
              borderRadius: "20px",
              color: gold,
              fontSize: "14px",
              marginBottom: "24px",
            }}
          >
            GPS Retirement Calculator
          </div>

          <h1
            style={{
              fontSize: "36px",
              color: navy,
              marginBottom: "20px",
              fontWeight: "600",
              lineHeight: 1.2,
            }}
          >
            Will You Have Enough to Retire?
          </h1>

          <p
            style={{
              fontSize: "18px",
              color: navy,
              marginBottom: "16px",
              lineHeight: 1.6,
            }}
          >
            Most people are saving. Fewer know if they are saving enough. Even
            fewer know if their allocation is helping or hurting.
          </p>

          <p
            style={{
              fontSize: "16px",
              color: gray,
              marginBottom: "32px",
              lineHeight: 1.6,
            }}
          >
            This calculator uses the same methodology we use with clients to
            show you exactly where you stand and what it would take to close any
            gap.
          </p>

          <button
            onClick={() => setStep(1)}
            style={{
              padding: "16px 32px",
              backgroundColor: gold,
              color: navy,
              border: "none",
              borderRadius: "6px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(201,162,39,0.3)",
            }}
          >
            Calculate My Retirement Gap
          </button>

          <p style={{ fontSize: "14px", color: gray, marginTop: "16px" }}>
            Interactive sliders - See results in real-time
          </p>
        </div>
      </Layout>
    );
  }

  // Step 1: Your Numbers (with sliders)
  if (step === 1) {
    return (
      <Layout>
        <div style={{ maxWidth: "600px", margin: "0 auto" }}>
          <p
            style={{
              fontSize: "12px",
              color: gold,
              textTransform: "uppercase",
              letterSpacing: "2px",
              marginBottom: "12px",
              textAlign: "center",
            }}
          >
            Step 1 of 2
          </p>
          <h2
            style={{
              fontSize: "28px",
              color: navy,
              marginBottom: "8px",
              fontWeight: "600",
              textAlign: "center",
            }}
          >
            Tell us about your situation
          </h2>

          {/* "Not Sure?" Quick Load Button */}
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <p
              style={{
                fontSize: "16px",
                color: gray,
                marginBottom: "16px",
                display: "inline",
              }}
            >
              Adjust the sliders to match your numbers, or
            </p>
            <button
              onClick={loadExample}
              style={{
                marginLeft: "12px",
                padding: "8px 16px",
                backgroundColor: cream,
                border: "1px solid " + gold,
                color: navy,
                borderRadius: "20px",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Load a Typical Example
            </button>
          </div>

          <div
            style={{
              backgroundColor: white,
              borderRadius: "12px",
              padding: "32px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            }}
          >
            <Slider
              label="Current Age"
              value={currentAge}
              setValue={setCurrentAge}
              min={25}
              max={70}
              step={1}
            />

            <Slider
              label="Retirement Age"
              value={retirementAge}
              setValue={setRetirementAge}
              min={Math.max(currentAge + 5, 55)}
              max={80}
              step={1}
            />

            <Slider
              label="Current Portfolio Value"
              value={currentPortfolio}
              setValue={setCurrentPortfolio}
              min={0}
              max={3000000}
              step={25000}
              format={(v) => formatCurrency(v)}
              description="Include 401k, IRA, brokerage, and other investments"
            />

            <Slider
              label="Monthly Contribution"
              value={monthlyContribution}
              setValue={setMonthlyContribution}
              min={0}
              max={10000}
              step={100}
              format={(v) => "$" + v.toLocaleString()}
              description="Include employer match"
            />

            <Slider
              label="Annual Income Needed in Retirement"
              value={annualIncomeNeeded}
              setValue={setAnnualIncomeNeeded}
              min={30000}
              max={300000}
              step={5000}
              format={(v) => "$" + v.toLocaleString()}
              description="In today's dollars. Should cover housing, healthcare, travel, and lifestyle. Exclude Social Security."
            />
          </div>

          <div style={{ marginTop: "24px" }}>
            <button
              onClick={() => setStep(2)}
              style={{
                width: "100%",
                padding: "16px 32px",
                backgroundColor: gold,
                color: navy,
                border: "none",
                borderRadius: "6px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(201,162,39,0.3)",
              }}
            >
              Continue
            </button>
            <button
              onClick={() => setStep(0)}
              style={{
                width: "100%",
                marginTop: "12px",
                padding: "12px",
                backgroundColor: "transparent",
                color: gray,
                border: "none",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              Back
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // Step 2: Allocation Question
  if (step === 2) {
    return (
      <Layout>
        <div style={{ maxWidth: "500px", margin: "0 auto" }}>
          <p
            style={{
              fontSize: "12px",
              color: gold,
              textTransform: "uppercase",
              letterSpacing: "2px",
              marginBottom: "12px",
              textAlign: "center",
            }}
          >
            Step 2 of 2
          </p>
          <h2
            style={{
              fontSize: "28px",
              color: navy,
              marginBottom: "8px",
              fontWeight: "600",
              textAlign: "center",
            }}
          >
            How are you currently invested?
          </h2>
          <p
            style={{
              fontSize: "16px",
              color: gray,
              marginBottom: "24px",
              textAlign: "center",
            }}
          >
            This helps us personalize your results
          </p>

          {[
            {
              key: "advisor",
              label: "My advisor manages a balanced portfolio",
            },
            { key: "targetDate", label: "Mostly in target-date funds" },
            { key: "safe", label: "Conservative - I prefer to play it safe" },
            { key: "unsure", label: "I am not really sure" },
          ].map((option) => (
            <div
              key={option.key}
              onClick={() => setAllocationReason(option.key)}
              style={{
                padding: "16px 20px",
                backgroundColor:
                  allocationReason === option.key
                    ? "rgba(201,162,39,0.1)"
                    : white,
                border:
                  allocationReason === option.key
                    ? "2px solid " + gold
                    : "2px solid " + grayLight,
                borderRadius: "6px",
                marginBottom: "12px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  border:
                    allocationReason === option.key
                      ? "2px solid " + gold
                      : "2px solid " + gray,
                  backgroundColor:
                    allocationReason === option.key ? gold : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {allocationReason === option.key && (
                  <div
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: white,
                    }}
                  />
                )}
              </div>
              <span style={{ fontSize: "16px", color: navy }}>
                {option.label}
              </span>
            </div>
          ))}

          <div style={{ marginTop: "24px" }}>
            <button
              onClick={() => setStep(3)}
              disabled={!allocationReason}
              style={{
                width: "100%",
                padding: "16px 32px",
                backgroundColor: allocationReason ? gold : grayLight,
                color: allocationReason ? navy : gray,
                border: "none",
                borderRadius: "6px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: allocationReason ? "pointer" : "not-allowed",
              }}
            >
              Show My Results
            </button>
            <button
              onClick={() => setStep(1)}
              style={{
                width: "100%",
                marginTop: "12px",
                padding: "12px",
                backgroundColor: "transparent",
                color: gray,
                border: "none",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              Back
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // Step 3: Results
  return (
    <Layout>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <h2
            style={{
              fontSize: "32px",
              color: navy,
              marginBottom: "8px",
              fontWeight: "600",
            }}
          >
            Your Retirement Projection
          </h2>
          <p style={{ fontSize: "16px", color: gray }}>
            Based on retiring at age {retirementAge} with{" "}
            {formatCurrency(annualIncomeNeeded)}/year income goal
          </p>
        </div>

        {/* The Big Difference - HERO SECTION */}
        {!results.onTrack6040 && (
          <div
            style={{
              backgroundColor: navy,
              borderRadius: "12px",
              padding: "32px",
              textAlign: "center",
              marginBottom: "24px",
            }}
          >
            <p
              style={{
                fontSize: "14px",
                color: "rgba(255,255,255,0.7)",
                marginBottom: "4px",
              }}
            >
              The difference between staying the course and switching strategies
            </p>
            <p
              style={{
                fontSize: "56px",
                color: gold,
                fontWeight: "700",
                margin: "0",
              }}
            >
              +
              {formatCurrency(
                results.futureValueEquity - results.futureValue6040
              )}
            </p>
            <p
              style={{
                fontSize: "16px",
                color: "rgba(255,255,255,0.8)",
                marginTop: "12px",
              }}
            >
              more at retirement with an equity-focused approach
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "8px",
                marginTop: "16px",
              }}
            >
              <span
                style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)" }}
              >
                60/40
              </span>
              <span style={{ fontSize: "20px", color: gold }}>→</span>
              <span style={{ fontSize: "14px", color: gold }}>Equity</span>
            </div>
          </div>
        )}

        {/* The Goal */}
        <div
          style={{
            backgroundColor: white,
            borderRadius: "12px",
            padding: "28px",
            marginBottom: "24px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
        >
          <h3
            style={{
              fontSize: "16px",
              color: gray,
              textTransform: "uppercase",
              letterSpacing: "1px",
              marginBottom: "16px",
            }}
          >
            What You Need at Retirement
          </h3>

          <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
            <div style={{ flex: 2, minWidth: "200px" }}>
              <p style={{ fontSize: "14px", color: gray, marginBottom: "4px" }}>
                Total Capital Needed
              </p>
              <p
                style={{
                  fontSize: "42px",
                  color: navy,
                  fontWeight: "700",
                  margin: 0,
                }}
              >
                {formatCurrency(results.totalCapitalNeeded)}
              </p>
            </div>
            <div style={{ flex: 1, minWidth: "150px" }}>
              <p style={{ fontSize: "13px", color: gray, marginBottom: "8px" }}>
                Breakdown:
              </p>
              <p style={{ fontSize: "14px", color: navy, margin: "0 0 4px 0" }}>
                Income fund: {formatCurrency(results.capitalForWithdrawals)}
              </p>
              <p style={{ fontSize: "14px", color: navy, margin: 0 }}>
                Cash reserve: {formatCurrency(results.cashContingency)}
              </p>
            </div>
          </div>

          <div
            style={{
              marginTop: "16px",
              padding: "12px 16px",
              backgroundColor: cream,
              borderRadius: "6px",
            }}
          >
            <p style={{ fontSize: "13px", color: gray, margin: 0 }}>
              Your {formatCurrency(annualIncomeNeeded)}/year becomes{" "}
              <strong style={{ color: navy }}>
                {formatCurrency(results.inflationAdjustedIncome)}/year
              </strong>{" "}
              after {yearsToRetirement} years of inflation (3%)
            </p>
          </div>
        </div>

        {/* The Comparison */}
        <div
          style={{
            display: "flex",
            gap: "24px",
            marginBottom: "24px",
            flexWrap: "wrap",
          }}
        >
          {/* 60/40 Projection */}
          <div
            style={{
              flex: 1,
              minWidth: "280px",
              backgroundColor: white,
              borderRadius: "12px",
              padding: "24px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              borderTop: results.onTrack6040
                ? "4px solid " + green
                : "4px solid " + red,
            }}
          >
            <p
              style={{
                fontSize: "12px",
                color: gray,
                textTransform: "uppercase",
                letterSpacing: "1px",
                marginBottom: "8px",
              }}
            >
              Traditional 60/40 Approach
            </p>
            <p style={{ fontSize: "13px", color: gray, marginBottom: "16px" }}>
              7% nominal return*
            </p>

            <p style={{ fontSize: "14px", color: gray, marginBottom: "4px" }}>
              Projected Result:
            </p>
            <p
              style={{
                fontSize: "24px",
                color: gray,
                fontWeight: "600",
                marginBottom: "16px",
              }}
            >
              {formatCurrency(results.futureValue6040)}
            </p>

            {results.onTrack6040 ? (
              <div
                style={{
                  padding: "16px",
                  backgroundColor: "rgba(39, 103, 73, 0.1)",
                  borderRadius: "6px",
                }}
              >
                <p
                  style={{
                    fontSize: "18px",
                    color: green,
                    margin: 0,
                    fontWeight: "700",
                  }}
                >
                  ✓ ON TRACK
                </p>
                <p
                  style={{ fontSize: "14px", color: navy, margin: "8px 0 0 0" }}
                >
                  {formatCurrency(
                    results.futureValue6040 - results.totalCapitalNeeded
                  )}{" "}
                  surplus
                </p>
              </div>
            ) : (
              <div
                style={{
                  padding: "16px",
                  backgroundColor: "#FFF5F5",
                  border: "1px solid #FC8181",
                  borderRadius: "6px",
                }}
              >
                <p
                  style={{
                    fontSize: "18px",
                    color: red,
                    margin: 0,
                    fontWeight: "700",
                  }}
                >
                  ⚠️ {formatCurrency(Math.abs(results.gap6040))} SHORT
                </p>
                <p
                  style={{ fontSize: "14px", color: navy, margin: "8px 0 0 0" }}
                >
                  To close this gap, you would need to save an extra{" "}
                  <strong>
                    {formatCurrency(
                      results.requiredMonthly6040 - monthlyContribution
                    )}
                    /mo
                  </strong>
                  .
                </p>
              </div>
            )}
          </div>

          {/* Equity Projection */}
          <div
            style={{
              flex: 1,
              minWidth: "280px",
              backgroundColor: white,
              borderRadius: "12px",
              padding: "24px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              borderTop: "4px solid " + gold,
            }}
          >
            <p
              style={{
                fontSize: "12px",
                color: gold,
                textTransform: "uppercase",
                letterSpacing: "1px",
                marginBottom: "8px",
              }}
            >
              Equity-Focused Approach
            </p>
            <p style={{ fontSize: "13px", color: gray, marginBottom: "16px" }}>
              10% nominal return (S&P 500 historical avg)
            </p>

            <p style={{ fontSize: "14px", color: gray, marginBottom: "4px" }}>
              Projected Result:
            </p>
            <p
              style={{
                fontSize: "24px",
                color: navy,
                fontWeight: "600",
                marginBottom: "16px",
              }}
            >
              {formatCurrency(results.futureValueEquity)}
            </p>

            {results.onTrackEquity ? (
              <div
                style={{
                  padding: "16px",
                  backgroundColor: "rgba(201, 162, 39, 0.15)",
                  border: "1px solid " + gold,
                  borderRadius: "6px",
                }}
              >
                <p
                  style={{
                    fontSize: "18px",
                    color: navy,
                    margin: 0,
                    fontWeight: "700",
                  }}
                >
                  ✓ {formatCurrency(results.equitySurplus)} SURPLUS
                </p>
                <p
                  style={{ fontSize: "14px", color: gray, margin: "8px 0 0 0" }}
                >
                  On track with room to spare. Could retire earlier or build
                  legacy.
                </p>
              </div>
            ) : (
              <div
                style={{
                  padding: "16px",
                  backgroundColor: "rgba(201, 162, 39, 0.15)",
                  borderRadius: "6px",
                }}
              >
                <p
                  style={{
                    fontSize: "18px",
                    color: navy,
                    margin: 0,
                    fontWeight: "700",
                  }}
                >
                  {formatCurrency(Math.abs(results.gapEquity))} short — but
                  closer
                </p>
                <p
                  style={{ fontSize: "14px", color: gray, margin: "8px 0 0 0" }}
                >
                  Would need {formatCurrency(results.requiredMonthlyEquity)}/mo
                  to close gap
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Personalized Message */}
        {allocationReason && (
          <div
            style={{
              backgroundColor: cream,
              borderRadius: "8px",
              padding: "20px",
              marginBottom: "24px",
              borderLeft: "4px solid " + gold,
            }}
          >
            <p
              style={{
                fontSize: "15px",
                color: navy,
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              {reasonMessages[allocationReason]}
            </p>
          </div>
        )}

        {/* Chart */}
        <div
          style={{
            backgroundColor: white,
            borderRadius: "12px",
            padding: "28px",
            marginBottom: "24px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
        >
          <h3
            style={{
              fontSize: "18px",
              color: navy,
              marginBottom: "20px",
              fontWeight: "600",
            }}
          >
            Projection to Age {retirementAge}
          </h3>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart
              data={results.chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorEquityGPS" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={gold} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={gold} stopOpacity={0} />
                </linearGradient>
                <linearGradient
                  id="colorTraditionalGPS"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor={gray} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={gray} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={grayLight} />
              <XAxis
                dataKey="age"
                tick={{ fontSize: 12, fill: gray }}
                tickFormatter={(v) => "Age " + v}
              />
              <YAxis
                tick={{ fontSize: 12, fill: gray }}
                tickFormatter={formatAxisValue}
                width={70}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="traditional"
                stroke={gray}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorTraditionalGPS)"
              />
              <Area
                type="monotone"
                dataKey="equity"
                stroke={gold}
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorEquityGPS)"
              />
              <Area
                type="monotone"
                dataKey="goal"
                stroke={navy}
                strokeWidth={2}
                strokeDasharray="5 5"
                fillOpacity={0}
              />
            </AreaChart>
          </ResponsiveContainer>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "24px",
              marginTop: "16px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "16px",
                  height: "3px",
                  backgroundColor: gray,
                  borderRadius: "2px",
                }}
              ></div>
              <span style={{ fontSize: "13px", color: gray }}>
                60/40 Approach (7%)
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "16px",
                  height: "3px",
                  backgroundColor: gold,
                  borderRadius: "2px",
                }}
              ></div>
              <span style={{ fontSize: "13px", color: navy }}>
                Equity Approach (10%)
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "16px",
                  height: "3px",
                  backgroundColor: navy,
                  borderRadius: "2px",
                  borderTop: "2px dashed " + navy,
                }}
              ></div>
              <span style={{ fontSize: "13px", color: navy }}>
                What You Need ({formatCurrency(results.totalCapitalNeeded)})
              </span>
            </div>
          </div>
        </div>

        {/* Compliance & Assumptions */}
        <div
          style={{
            backgroundColor: cream,
            borderRadius: "8px",
            padding: "20px",
            marginBottom: "32px",
            fontSize: "12px",
            color: gray,
            borderTop: "2px solid " + grayLight,
          }}
        >
          <p
            style={{
              fontWeight: "700",
              marginBottom: "8px",
              color: navy,
              textTransform: "uppercase",
            }}
          >
            Important Disclosures & Methodology
          </p>

          <p style={{ marginBottom: "8px" }}>
            <strong>Hypothetical Nature:</strong> The projections generated by
            this GPS Calculator regarding the likelihood of various investment
            outcomes are hypothetical in nature, do not reflect actual
            investment results, and are not guarantees of future results.
            Results may vary with each use and over time.
          </p>
          <p style={{ marginBottom: "8px" }}>
            <strong>Assumptions Used:</strong>
          </p>
          <ul style={{ paddingLeft: "20px", margin: "4px 0 8px 0" }}>
            <li>
              <strong>Inflation:</strong> 3% annually.
            </li>
            <li>
              <strong>Withdrawals:</strong> 4.5% annual withdrawal rate from the
              portfolio balance.
            </li>
            <li>
              <strong>Cash Reserve:</strong> 12 months of expenses set aside for
              contingencies.
            </li>
            <li>
              <strong>Returns:</strong> The "Traditional 60/40" scenario assumes
              a 7% fixed annual return. The "Equity-Focused" scenario assumes a
              10% fixed annual return based on the S&P 500 historical average.
            </li>
            <li>
              <strong>Income Needed:</strong> Should cover your typical living
              expenses including housing, healthcare, travel, and lifestyle
              costs. This does not include Social Security or other income
              sources.
            </li>
          </ul>
          <p style={{ marginBottom: "8px" }}>
            <strong>Limitations:</strong> These fixed return assumptions
            represent nominal averages and do not account for market volatility,
            sequence of returns risk, or economic downturns. In the real world,
            a portfolio with a higher average return (like the Equity approach)
            typically experiences higher volatility, which can negatively impact
            the actual dollar amount available for withdrawal.
          </p>
          <p style={{ fontStyle: "italic" }}>
            <strong>Gross of Fees:</strong> The results shown are{" "}
            <strong>gross of advisory fees</strong>. Client returns would be
            reduced by advisory fees and other expenses. For example, a 1%
            advisory fee compounded over 20 years would reduce the final
            portfolio value by approximately 18%.
          </p>
        </div>

        {/* CTA */}
        <div
          style={{
            backgroundColor: white,
            borderRadius: "12px",
            padding: "36px",
            textAlign: "center",
            borderTop: "4px solid " + gold,
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            marginBottom: "24px",
          }}
        >
          <h3
            style={{
              fontSize: "26px",
              color: navy,
              marginBottom: "12px",
              fontWeight: "600",
            }}
          >
            {results.onTrack6040
              ? "You are on track. But are you optimized?"
              : "Let us help you close the gap."}
          </h3>
          <p
            style={{
              fontSize: "16px",
              color: gray,
              marginBottom: "24px",
              maxWidth: "500px",
              margin: "0 auto 24px",
            }}
          >
            {results.onTrack6040
              ? "A GPS Conversation can show you if there is an opportunity to retire earlier, save less, or build more legacy."
              : "A GPS Conversation will map out exactly what it takes to get you on track, using a plan built around YOUR goals."}
          </p>

          <div
            style={{
              backgroundColor: cream,
              borderRadius: "8px",
              padding: "20px",
              marginBottom: "24px",
              maxWidth: "520px",
              margin: "0 auto 24px",
            }}
          >
            <p
              style={{
                fontSize: "17px",
                fontStyle: "italic",
                color: navy,
                lineHeight: 1.6,
                marginBottom: "8px",
              }}
            >
              "With no plan, you are so susceptible to just jumping from one
              thing to the other. And that is what creates scenarios where you
              underperform and do not end up achieving what you could."
            </p>
            <p style={{ fontSize: "13px", color: gray }}>
              - Ben Beck, CFP, CIO and Managing Partner
            </p>
          </div>

          <a
            href="https://meetings.hubspot.com/vinny-savio/fit-call?uuid=27310bbf-958b-46a9-9a39-c08a56477a77"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              padding: "18px 36px",
              backgroundColor: gold,
              color: navy,
              border: "none",
              borderRadius: "6px",
              fontSize: "17px",
              fontWeight: "600",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(201,162,39,0.3)",
              textDecoration: "none",
            }}
          >
            Schedule a GPS Conversation
          </a>
          <p
            style={{
              fontSize: "14px",
              color: gray,
              marginTop: "12px",
              marginBottom: "24px",
            }}
          >
            Free - 30 minutes - No obligation
          </p>

          {!showEmailCapture ? (
            <button
              onClick={() => setShowEmailCapture(true)}
              style={{
                padding: "12px 24px",
                backgroundColor: "transparent",
                color: navy,
                border: "1px solid " + grayLight,
                borderRadius: "6px",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              Or email me this projection
            </button>
          ) : emailStatus === "success" ? (
            <div
              style={{
                backgroundColor: "rgba(39, 103, 73, 0.1)",
                borderRadius: "8px",
                padding: "20px",
                maxWidth: "400px",
                margin: "0 auto",
              }}
            >
              <p
                style={{
                  fontSize: "16px",
                  color: green,
                  fontWeight: "600",
                  marginBottom: "8px",
                }}
              >
                ✓ Sent!
              </p>
              <p style={{ fontSize: "14px", color: navy, margin: 0 }}>
                Check your inbox for your personalized projection and GPS
                planning guide.
              </p>
            </div>
          ) : (
            <div
              style={{
                backgroundColor: cream,
                borderRadius: "8px",
                padding: "20px",
                maxWidth: "400px",
                margin: "0 auto",
              }}
            >
              <p
                style={{ fontSize: "14px", color: navy, marginBottom: "12px" }}
              >
                Get your personalized projection + our GPS planning guide
              </p>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={emailStatus === "sending"}
                  style={{
                    flex: 1,
                    padding: "12px 14px",
                    borderRadius: "6px",
                    border: "1px solid " + grayLight,
                    fontSize: "14px",
                    outline: "none",
                    opacity: emailStatus === "sending" ? 0.6 : 1,
                  }}
                />
                <button
                  onClick={submitToHubSpot}
                  disabled={emailStatus === "sending"}
                  style={{
                    padding: "12px 20px",
                    backgroundColor: emailStatus === "sending" ? gray : navy,
                    color: white,
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor:
                      emailStatus === "sending" ? "not-allowed" : "pointer",
                  }}
                >
                  {emailStatus === "sending" ? "Sending..." : "Send"}
                </button>
              </div>
              {emailStatus === "error" && (
                <p style={{ fontSize: "13px", color: red, marginTop: "8px" }}>
                  Something went wrong. Please try again or schedule a call
                  instead.
                </p>
              )}
              {emailStatus === "invalid" && (
                <p style={{ fontSize: "13px", color: red, marginTop: "8px" }}>
                  Please enter a valid email address.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Adjust Numbers */}
        <div style={{ textAlign: "center" }}>
          <button
            onClick={() => setStep(1)}
            style={{
              padding: "12px 24px",
              backgroundColor: "transparent",
              color: gray,
              border: "1px solid " + grayLight,
              borderRadius: "6px",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Adjust my numbers
          </button>
        </div>
      </div>
    </Layout>
  );
}

function Layout({ children }) {
  const navy = "#1a365d";
  const gold = "#c9a227";
  const cream = "#f7f5f0";

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: cream,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <header
        style={{
          backgroundColor: navy,
          padding: "16px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              backgroundColor: gold,
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "700",
              color: navy,
              fontSize: "18px",
            }}
          >
            B
          </div>
          <div>
            <div
              style={{ color: "white", fontWeight: "600", fontSize: "16px" }}
            >
              BECK BODE
            </div>
            <div
              style={{
                color: "rgba(255,255,255,0.6)",
                fontSize: "10px",
                letterSpacing: "1px",
              }}
            >
              WEALTH MANAGEMENT
            </div>
          </div>
        </div>
      </header>

      <main style={{ padding: "48px 24px 80px" }}>{children}</main>

      <footer
        style={{
          backgroundColor: navy,
          padding: "14px 24px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "16px",
        }}
      >
        <span style={{ color: gold, fontStyle: "italic", fontSize: "14px" }}>
          What's your dream?
        </span>
        <span style={{ color: "rgba(255,255,255,0.3)" }}>|</span>
        <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px" }}>
          beckbode.com
        </span>
      </footer>
    </div>
  );
}
