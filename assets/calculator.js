  const $ = (id) => document.getElementById(id);

  function num(v) {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }

  function fmtLb(n) {
    if (!Number.isFinite(n)) return "—";
    const sign = n < 0 ? "-" : "";
    return sign + Math.round(Math.abs(n)).toLocaleString() + " lb";
  }

  function setStatus(level, title, subtitle, meaning) {
    const dot = $("statusDot");
    dot.className = "dot " + (level || "");
    $("statusTitle").textContent = title;
    $("statusSubtitle").textContent = subtitle || "";
    $("statusMeaning").textContent = meaning || "";
  }

  function addWarning(arr, text) { arr.push(text); }

  // Trailer type profiles: ranges & default behavior
  const PROFILES = {
    car: {
      name: "Car trailer / utility (bumper-pull)",
      hint: "Typical tongue weight range: 10–15%.",
      pctOptions: [
        { v: 0.10, t: "10% (minimum typical)" },
        { v: 0.12, t: "12% (common)" },
        { v: 0.15, t: "15% (conservative)" }
      ],
      defaultPct: 0.12
    },
    travel: {
      name: "Travel trailer / camper (bumper-pull)",
      hint: "Typical tongue weight range: 12–15% (often higher than car trailers).",
      pctOptions: [
        { v: 0.12, t: "12% (minimum typical)" },
        { v: 0.13, t: "13% (common)" },
        { v: 0.15, t: "15% (conservative)" }
      ],
      defaultPct: 0.13
    },
    fifth: {
      name: "5th wheel / gooseneck",
      hint: "Typical pin weight range: 15–25% (much higher payload impact).",
      pctOptions: [
        { v: 0.15, t: "15% (light pin)" },
        { v: 0.20, t: "20% (common)" },
        { v: 0.25, t: "25% (conservative)" }
      ],
      defaultPct: 0.20
    }
  };

  function populatePctOptions(typeKey) {
    const profile = PROFILES[typeKey];
    const sel = $("twPct");
    sel.innerHTML = "";
    profile.pctOptions.forEach(o => {
      const opt = document.createElement("option");
      opt.value = String(o.v);
      opt.textContent = o.t;
      sel.appendChild(opt);
    });
    sel.value = String(profile.defaultPct);
    $("typeHint").textContent = profile.hint;

    // WDH is mainly for travel trailers; keep it available but nudge user
    if (typeKey === "travel") {
      $("wdh").disabled = false;
      $("twHint").textContent = "Travel trailers often benefit from a properly sized WDH (does not remove payload; it redistributes).";
    } else if (typeKey === "car") {
      $("wdh").disabled = false;
      $("twHint").textContent = "Car trailers usually run best with correct tongue weight and trailer brakes where required.";
    } else {
      $("wdh").checked = false;
      $("wdh").disabled = true;
      $("twHint").textContent = "5th wheels use pin weight and a different hitch system. WDH toggle disabled.";
    }
  }

  const weightInputs = {
    payload: "Payload rating", towRating: "Tow rating", passengers: "Passenger weight",
    cargo: "Cargo weight", hitchHardware: "Hitch hardware weight", gcwr: "GCWR",
    vehicleActual: "Actual vehicle weight", trailerWeight: "Loaded trailer weight",
    receiverTW: "Receiver tongue weight rating", receiverTow: "Receiver trailer weight rating"
  };
  const requiredWeights = new Set(["payload", "trailerWeight"]);
  const resultFields = ["kpiTongue","kpiPayloadUsed","kpiPayloadLeft","kpiTowCheck","kpiCombined","kpiGcwrCheck"];

  function validateWeights() {
    const issues = [];
    for (const [id, label] of Object.entries(weightInputs)) {
      const field = $(id);
      const value = field.value.trim();
      if (field.validity.badInput || (value !== "" && (!Number.isFinite(Number(value)) || Number(value) < 0))) {
        issues.push(label + " must be a valid nonnegative weight.");
      } else if (requiredWeights.has(id) && (value === "" || Number(value) === 0)) {
        issues.push("Enter a " + label.toLowerCase() + " greater than zero.");
      }
    }
    return issues;
  }

  function calculate() {
    const issues = validateWeights();
    if (issues.length) {
      resultFields.forEach(id => $(id).textContent = "—");
      const list = $("warningsList");
      list.innerHTML = "";
      for (const issue of issues) {
        const li = document.createElement("li");
        li.textContent = issue;
        list.appendChild(li);
      }
      setStatus("yellow", "Check your inputs", "No result until the weights are valid.", "This setup has not been evaluated.");
      return;
    }
    const trailerType = $("trailerType").value;
    const profile = PROFILES[trailerType];

    const payload = num($("payload").value);
    const towRating = num($("towRating").value);
    const passengers = num($("passengers").value);
    const cargo = num($("cargo").value);
    const hitchHardware = num($("hitchHardware").value);

    const trailerWeight = num($("trailerWeight").value);
    const twPct = num($("twPct").value);

    const wdh = $("wdh").checked;
    const brakes = $("trailerBrakes").value;

    const receiverTW = num($("receiverTW").value);
    const receiverTow = num($("receiverTow").value);

    const gcwr = num($("gcwr").value);
    const vehicleActual = num($("vehicleActual").value);

    const warnings = [];

    // Tongue/pin weight estimate
    const tongue = trailerWeight * twPct;

    // Payload usage
    const payloadUsed = passengers + cargo + hitchHardware + tongue;
    const payloadLeft = payload - payloadUsed;

    // Tow rating check (optional)
    let towCheckText = "—";
    if (towRating > 0 && trailerWeight > 0) {
      const diff = towRating - trailerWeight;
      towCheckText = (diff >= 0)
        ? ("OK (" + Math.round(diff).toLocaleString() + " lb margin)")
        : ("OVER (" + Math.round(Math.abs(diff)).toLocaleString() + " lb)");
      if (diff < 0) addWarning(warnings, "Trailer weight exceeds the vehicle’s tow rating. Reduce trailer weight or choose a higher-rated tow vehicle.");
    } else if (towRating === 0) {
      towCheckText = "Not provided";
      addWarning(warnings, "Tow rating not provided. Verify in the owner’s manual (payload can still fail first).");
    }

    // Receiver checks (optional)
    if (receiverTW > 0 && tongue > 0 && tongue > receiverTW) {
      addWarning(warnings, "Estimated tongue/pin weight exceeds receiver/hitch max tongue weight rating. Verify the receiver label (hard limit).");
    }
    if (receiverTow > 0 && trailerWeight > 0 && trailerWeight > receiverTow) {
      addWarning(warnings, "Trailer weight exceeds receiver/hitch max trailer weight rating. Verify hitch class/label.");
    }

    // Tongue/pin % sanity checks by type
    if (trailerWeight > 0) {
      const pct = tongue / trailerWeight;

      if (trailerType === "car") {
        if (pct < 0.10) addWarning(warnings, "Tongue weight seems low (<10%). Low TW increases sway risk. Recheck inputs and load balance.");
        if (pct > 0.16) addWarning(warnings, "Tongue weight seems high (>16%). Verify load placement and ratings; recheck inputs.");
      }

      if (trailerType === "travel") {
        if (pct < 0.12) addWarning(warnings, "Tongue weight seems low (<12%) for a travel trailer. Travel trailers often sway if TW is too low.");
        if (pct > 0.17) addWarning(warnings, "Tongue weight seems high (>17%). Verify load placement, consider WDH, and recheck ratings.");
        if (!wdh && trailerWeight >= 5000) addWarning(warnings, "Many travel trailers around 5,000 lb+ handle better with a properly sized WDH (check your manual).");
        if (wdh) addWarning(warnings, "WDH can improve handling by redistributing load, but tongue weight still counts against payload. Confirm receiver ratings for WDH use.");
      }

      if (trailerType === "fifth") {
        if (pct < 0.15) addWarning(warnings, "Pin weight seems low (<15%) for a 5th wheel/gooseneck. Recheck inputs.");
        if (pct > 0.27) addWarning(warnings, "Pin weight seems very high (>27%). Recheck inputs and verify ratings.");
        addWarning(warnings, "5th wheels/goosenecks hit payload fast. Confirm truck payload, rear axle limits, and tire ratings.");
      }
    }

    // Payload warnings
    if (payload > 0) {
      if (payloadLeft < 0) {
        addWarning(warnings, "You exceed payload (door sticker). This is one of the most common real-world failure points.");
        addWarning(warnings, "Fix: reduce passengers/cargo, reduce tongue/pin weight (lighter trailer or load), or use a higher-payload tow vehicle.");
      } else if (payloadLeft < 150) {
        addWarning(warnings, "Very tight payload margin (<150 lb). Small errors or extra gear can put you over.");
      } else if (payloadLeft < 300) {
        addWarning(warnings, "Tight payload margin (<300 lb). Be conservative and consider a weigh-in.");
      }
    }

    // Brake guidance
    if (trailerWeight > 3000) {
      if (brakes === "no") addWarning(warnings, "A trailer this heavy without brakes is a major safety issue (and often illegal). Verify your local requirements.");
      if (brakes === "unknown") addWarning(warnings, "If the trailer is this heavy, it likely needs trailer brakes + a brake controller. Verify trailer equipment and laws.");
      if (brakes === "yes") addWarning(warnings, "Ensure your brake controller is correctly set. Trailer brakes are critical for safe stopping.");
    }

    // GCWR / combined check (optional)
    let combined = NaN;
    let gcwrCheckText = "Not used";
    if (gcwr > 0 && vehicleActual > 0 && trailerWeight > 0) {
      combined = vehicleActual + trailerWeight;
      const diff = gcwr - combined;
      gcwrCheckText = (diff >= 0)
        ? ("OK (" + Math.round(diff).toLocaleString() + " lb margin)")
        : ("OVER (" + Math.round(Math.abs(diff)).toLocaleString() + " lb)");
      if (diff < 0) addWarning(warnings, "Estimated combined weight exceeds GCWR. Reduce weight or choose a higher-rated tow vehicle.");
    } else if (gcwr > 0 && (vehicleActual === 0 || trailerWeight === 0)) {
      gcwrCheckText = "Need vehicle actual + trailer";
      addWarning(warnings, "To use GCWR, enter estimated vehicle actual weight (or scale weight) and trailer loaded weight.");
    }

    // Best-practice reminders
    addWarning(warnings, "Best practice: do a CAT scale weigh-in to confirm real vehicle/trailer weights and axle loads.");

    // Update KPIs
    $("kpiTongue").textContent = fmtLb(tongue);
    $("kpiPayloadUsed").textContent = (payloadUsed > 0) ? fmtLb(payloadUsed) : "—";
    $("kpiPayloadLeft").textContent = (payload > 0) ? fmtLb(payloadLeft) : "—";
    $("kpiTowCheck").textContent = towCheckText;

    $("kpiCombined").textContent = Number.isFinite(combined) ? fmtLb(combined) : "—";
    $("kpiGcwrCheck").textContent = gcwrCheckText;

    // Render warnings
    const ul = $("warningsList");
    ul.innerHTML = "";
    const uniqueWarnings = Array.from(new Set(warnings));
    if (uniqueWarnings.length === 0) {
      const li = document.createElement("li");
      li.textContent = "No warnings. Still verify ratings and consider a real weigh-in.";
      ul.appendChild(li);
    } else {
      uniqueWarnings.forEach(w => {
        const li = document.createElement("li");
        li.textContent = w;
        ul.appendChild(li);
      });
    }

    // Overall status (conservative)
    let level = "green";
    const overPayload = payload > 0 && payloadLeft < 0;
    const tightPayload = payload > 0 && payloadLeft < 300;
    const overTow = towRating > 0 && trailerWeight > towRating;
    const overReceiverTW = receiverTW > 0 && tongue > receiverTW;
    const overReceiverTow = receiverTow > 0 && trailerWeight > receiverTow;
    const overGcwr = (gcwr > 0 && vehicleActual > 0 && trailerWeight > 0) && ((vehicleActual + trailerWeight) > gcwr);

    const brakesMissing = trailerWeight > 3000 && brakes === "no";
    const brakesUnverified = trailerWeight > 3000 && brakes === "unknown";
    const ratingsUnverified = !towRating || !receiverTW || !receiverTow || (gcwr > 0 && !vehicleActual);
    const ratingExceeded = overPayload || overTow || overReceiverTW || overReceiverTow || overGcwr;
    if (ratingExceeded || brakesMissing) level = "red";
    else if (tightPayload || brakesUnverified || ratingsUnverified) level = "yellow";

    if (brakesMissing) {
      setStatus(
        "red", ratingExceeded ? "High risk: no trailer brakes and a rating is exceeded" : "High risk: no trailer brakes reported",
        "Do not rely on a weight margin to judge stopping ability. Check the vehicle and trailer manuals.",
        "Verify required brake equipment and controller compatibility before towing."
      );
    } else if (level === "red") {
      setStatus(
        "red",
        "High risk: likely overloaded / exceeds a rating",
        "Primary issues: payload and/or ratings. Reduce weight or change equipment/vehicle.",
        "One or more limits appear exceeded. This setup likely needs changes."
      );
    } else if (level === "yellow") {
      setStatus(
        "yellow",
        brakesUnverified ? "Caution: verify trailer brakes" : tightPayload ? "Caution: tight payload margin" : "Caution: some ratings not verified",
        "Double-check the warnings and confirm actual weights and equipment.",
        "This estimate cannot confirm that the setup is safe to tow."
      );
    } else {
      setStatus(
        "green",
        "No exceeded rating found in the numbers entered",
        "An estimate only. Verify actual loaded weights, equipment, and all applicable ratings.",
        "This result is not a towing safety clearance."
      );
    }
  }

  function resetAll() {
    ["payload","towRating","passengers","cargo","hitchHardware","trailerWeight","receiverTW","receiverTow","vehicleNotes","gcwr","vehicleActual"].forEach(id => {
      if ($(id)) $(id).value = (id === "hitchHardware") ? "60" : "";
    });
    $("trailerType").value = "car";
    populatePctOptions("car");
    $("wdh").checked = false;
    $("wdh").disabled = false;
    $("trailerBrakes").value = "unknown";

    ["kpiTongue","kpiPayloadUsed","kpiPayloadLeft","kpiTowCheck","kpiCombined","kpiGcwrCheck"].forEach(id => $(id).textContent = "—");
    $("warningsList").innerHTML = "";
    setStatus("", "Enter your numbers and click Calculate", "Trailer type changes the tongue/pin weight assumptions.", "Enter your numbers, then check your setup.");
  }

  // Wire up
  $("calcBtn").addEventListener("click", calculate);
  $("resetBtn").addEventListener("click", resetAll);

  $("trailerType").addEventListener("change", () => {
    populatePctOptions($("trailerType").value);
  });

  // Auto calc on Enter
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") calculate();
  });

  // init
  populatePctOptions("car");
  setStatus("", "Enter your numbers and click Calculate", "Trailer type changes the tongue/pin weight assumptions.", "Enter your numbers, then check your setup.");
