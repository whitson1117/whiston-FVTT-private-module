(function () {
    if (globalThis.TweenMax && globalThis.gsap && !globalThis.TweenMax.__theatreShim) return;

    const activeTweens = new WeakMap();
    const allTweens = new Set();
    const transformState = new WeakMap();
    const raf = globalThis.requestAnimationFrame?.bind(globalThis) ?? ((fn) => setTimeout(() => fn(performance.now()), 16));
    const caf = globalThis.cancelAnimationFrame?.bind(globalThis) ?? clearTimeout;

    const noopEase = (t) => t;
    const ease = {
        easeNone: noopEase,
        easeOut: noopEase,
        easeIn: noopEase,
        easeInOut: noopEase,
        none: noopEase,
    };
    const easeFamily = { easeOut: noopEase, easeIn: noopEase, easeInOut: noopEase };
    const ignoredVars = new Set([
        "pixi",
        "scrollTo",
        "ease",
        "delay",
        "duration",
        "repeat",
        "repeatDelay",
        "stagger",
        "yoyo",
        "yoyoEase",
        "overwrite",
        "paused",
        "onComplete",
        "onCompleteParams",
        "onUpdate",
        "onUpdateParams",
    ]);
    const transformKeys = new Set(["scale", "scaleX", "scaleY", "rotation", "rotate", "x", "y"]);

    const toArray = (targets) => {
        if (!targets) return [];
        if (targets instanceof NodeList || targets instanceof HTMLCollection) return Array.from(targets);
        if (Array.isArray(targets)) return targets;
        if (typeof targets.length === "number" && !targets.nodeType && !targets.texture && typeof targets !== "string") {
            return Array.from(targets);
        }
        return [targets];
    };

    const isElement = (target) => globalThis.Element && target instanceof Element;

    const remember = (target, tween) => {
        if (!target || typeof target !== "object") return;
        const tweens = activeTweens.get(target) ?? new Set();
        tweens.add(tween);
        activeTweens.set(target, tweens);
    };

    const forget = (target, tween) => {
        const tweens = activeTweens.get(target);
        if (!tweens) return;
        tweens.delete(tween);
        if (!tweens.size) activeTweens.delete(target);
    };

    const getTransform = (target) => {
        let state = transformState.get(target);
        if (!state) {
            state = { scale: 1, scaleX: 1, scaleY: 1, rotation: 0, x: 0, y: 0 };
            transformState.set(target, state);
        }
        return state;
    };

    const renderTransform = (target) => {
        const state = getTransform(target);
        const transforms = [];
        if (state.x) transforms.push(`translateX(${state.x}px)`);
        if (state.y) transforms.push(`translateY(${state.y}px)`);
        if (state.rotation) transforms.push(`rotate(${state.rotation}deg)`);
        if (state.scale !== 1) transforms.push(`scale(${state.scale})`);
        if (state.scaleX !== 1) transforms.push(`scaleX(${state.scaleX})`);
        if (state.scaleY !== 1) transforms.push(`scaleY(${state.scaleY})`);
        target.style.transform = transforms.join(" ");
    };

    const parseValue = (value, fallback = 0) => {
        if (typeof value === "number") return { number: value, unit: "", raw: value, numeric: true };
        if (typeof value === "string") {
            const match = value.trim().match(/^(-?\d+(?:\.\d+)?)([a-z%]*)$/i);
            if (match) return { number: Number(match[1]), unit: match[2] ?? "", raw: value, numeric: true };
            return { number: Number(fallback) || 0, unit: "", raw: value, numeric: false };
        }
        return { number: Number(value ?? fallback) || 0, unit: "", raw: value, numeric: typeof value !== "undefined" };
    };

    const interpolate = (from, to, progress) => {
        const start = parseValue(from);
        const end = parseValue(to, start.number);
        if (!start.numeric || !end.numeric || start.unit !== end.unit) return progress >= 1 ? to : from;
        const mixed = start.number + (end.number - start.number) * progress;
        return start.unit ? `${mixed}${start.unit}` : mixed;
    };

    const setPixiValue = (target, key, value) => {
        const numeric = Number(value);
        if (key === "scaleX" && target.scale) target.scale.x = numeric;
        else if (key === "scaleY" && target.scale) target.scale.y = numeric;
        else if (key === "rotation") target.rotation = Math.abs(numeric) > Math.PI * 2 ? numeric * (Math.PI / 180) : numeric;
        else target[key] = value;
    };

    const getPixiValue = (target, key) => {
        if (key === "scaleX" && target.scale) return target.scale.x;
        if (key === "scaleY" && target.scale) return target.scale.y;
        if (key === "rotation") return (target.rotation || 0) * (180 / Math.PI);
        return target[key] ?? 0;
    };

    const setDomValue = (target, key, value) => {
        if (!target?.style) {
            target[key] = value;
            return;
        }
        if (transformKeys.has(key)) {
            const state = getTransform(target);
            const prop = key === "rotate" ? "rotation" : key;
            state[prop] = Number(parseValue(value).number);
            renderTransform(target);
            return;
        }
        if (key === "autoAlpha") target.style.opacity = String(value);
        else if (key in target.style) target.style[key] = typeof value === "number" && key !== "opacity" && key !== "zIndex" ? `${value}px` : String(value);
        else target[key] = value;
    };

    const getDomValue = (target, key) => {
        if (!target?.style) return target[key] ?? 0;
        if (transformKeys.has(key)) {
            const prop = key === "rotate" ? "rotation" : key;
            return getTransform(target)[prop] ?? 0;
        }
        if (key === "autoAlpha") return Number(target.style.opacity || getComputedStyle(target).opacity || 1);
        if (key === "opacity") return Number(target.style.opacity || getComputedStyle(target).opacity || 1);
        if (key in target.style) return target.style[key] || 0;
        return target[key] ?? 0;
    };

    const getValue = (target, key, kind) => kind === "pixi" ? getPixiValue(target, key) : getDomValue(target, key);
    const setValue = (target, key, value, kind) => {
        if (kind === "pixi") setPixiValue(target, key, value);
        else setDomValue(target, key, value);
    };

    const normalizeArgs = (durationOrVars, varsMaybe) => {
        const vars = typeof durationOrVars === "object" ? durationOrVars ?? {} : varsMaybe ?? {};
        const duration = typeof durationOrVars === "object" ? Number(vars.duration ?? 0) : Number(durationOrVars ?? vars.duration ?? 0);
        return { vars, duration: Number.isFinite(duration) ? duration : 0 };
    };

    const buildPairs = (target, vars, mode) => {
        const pairs = [];
        if (vars.pixi) {
            for (const [key, finalValue] of Object.entries(vars.pixi)) {
                pairs.push({
                    kind: "pixi",
                    key,
                    from: mode === "from" ? finalValue : getValue(target, key, "pixi"),
                    to: mode === "from" ? getValue(target, key, "pixi") : finalValue,
                });
            }
        }
        if (vars.scrollTo) {
            if (typeof vars.scrollTo.x === "number") {
                pairs.push({
                    kind: "prop",
                    key: "scrollLeft",
                    from: target.scrollLeft ?? 0,
                    to: Math.max(0, vars.scrollTo.x - (vars.scrollTo.offsetX ?? 0)),
                });
            }
            if (typeof vars.scrollTo.y === "number") {
                pairs.push({
                    kind: "prop",
                    key: "scrollTop",
                    from: target.scrollTop ?? 0,
                    to: Math.max(0, vars.scrollTo.y - (vars.scrollTo.offsetY ?? 0)),
                });
            }
        }
        for (const [key, finalValue] of Object.entries(vars)) {
            if (ignoredVars.has(key)) continue;
            const kind = isElement(target) ? "dom" : "pixi";
            pairs.push({
                kind,
                key,
                from: mode === "from" ? finalValue : getValue(target, key, kind),
                to: mode === "from" ? getValue(target, key, kind) : finalValue,
            });
        }
        return pairs;
    };

    const applyPairs = (target, pairs, progress) => {
        for (const pair of pairs) {
            const value = interpolate(pair.from, pair.to, progress);
            if (pair.kind === "prop") target[pair.key] = value;
            else setValue(target, pair.key, value, pair.kind);
        }
    };

    const makeTween = (targets, durationOrVars, varsMaybe, mode = "to") => {
        const list = toArray(targets);
        const { vars, duration } = normalizeArgs(durationOrVars, varsMaybe);
        const durationMs = Math.max(0, duration * 1000);
        const baseDelayMs = Math.max(0, Number(vars.delay ?? 0) * 1000);
        const repeatDelayMs = Math.max(0, Number(vars.repeatDelay ?? 0) * 1000);
        const repeat = Number(vars.repeat ?? 0);
        const yoyo = !!vars.yoyo;
        const staggerEachMs = Math.max(0, Number(vars.stagger?.each ?? vars.stagger ?? 0) * 1000);
        let frameId = null;
        let killed = false;
        let paused = false;
        let pausedAt = 0;
        let durationOverride = duration;

        const states = list.map((target, index) => ({
            target,
            delayMs: baseDelayMs + index * staggerEachMs,
            startTime: null,
            pairs: null,
            done: false,
            staggerComplete: false,
        }));

        const tween = {
            __theatreShim: true,
            kill() {
                killed = true;
                if (frameId !== null) caf(frameId);
                list.forEach((target) => forget(target, tween));
                allTweens.delete(tween);
                return tween;
            },
            targets() {
                return list;
            },
            duration(value) {
                if (typeof value === "undefined") return durationOverride;
                durationOverride = Number(value) || durationOverride;
                return tween;
            },
            pause() {
                paused = true;
                pausedAt = performance.now();
                return tween;
            },
            play() {
                if (!paused) return tween;
                const offset = performance.now() - pausedAt;
                for (const state of states) {
                    if (state.startTime !== null) state.startTime += offset;
                }
                paused = false;
                tick(performance.now());
                return tween;
            },
        };

        const completeTarget = (state, progress) => {
            applyPairs(state.target, state.pairs, progress);
            if (!state.staggerComplete && typeof vars.stagger?.onComplete === "function") {
                state.staggerComplete = true;
                vars.stagger.onComplete.call({ targets: () => [state.target] });
            }
            state.done = true;
            forget(state.target, tween);
        };

        const updateState = (state, now) => {
            if (state.done) return true;
            if (state.startTime === null) state.startTime = now + state.delayMs;
            if (now < state.startTime) return false;
            if (!state.pairs) {
                state.pairs = buildPairs(state.target, vars, mode);
                applyPairs(state.target, state.pairs, 0);
                if (mode === "set" || durationMs === 0) {
                    completeTarget(state, 1);
                    return true;
                }
            }

            const cycleMs = durationMs + repeatDelayMs;
            const elapsed = now - state.startTime;
            let cycle = cycleMs > 0 ? Math.floor(elapsed / cycleMs) : 0;
            let cycleElapsed = cycleMs > 0 ? elapsed - cycle * cycleMs : durationMs;
            if (repeat >= 0 && cycle > repeat) {
                const finalProgress = yoyo && repeat % 2 === 1 ? 0 : 1;
                completeTarget(state, finalProgress);
                return true;
            }
            if (cycleElapsed > durationMs) {
                const holdProgress = yoyo && cycle % 2 === 1 ? 0 : 1;
                applyPairs(state.target, state.pairs, holdProgress);
                return false;
            }

            let progress = durationMs > 0 ? Math.min(1, Math.max(0, cycleElapsed / durationMs)) : 1;
            if (yoyo && cycle % 2 === 1) progress = 1 - progress;
            applyPairs(state.target, state.pairs, progress);
            if (typeof vars.onUpdate === "function") vars.onUpdate.apply(tween, vars.onUpdateParams ?? []);
            return false;
        };

        const tick = (now) => {
            if (killed || paused) return;
            const done = states.every((state) => updateState(state, now));
            if (done) {
                if (typeof vars.onComplete === "function") vars.onComplete.apply(tween, vars.onCompleteParams ?? []);
                allTweens.delete(tween);
                return;
            }
            frameId = raf(tick);
        };

        list.forEach((target) => remember(target, tween));
        allTweens.add(tween);
        frameId = raf(tick);
        return tween;
    };

    const tweenApi = {
        __theatreShim: true,
        to: (targets, durationOrVars, vars) => makeTween(targets, durationOrVars, vars, "to"),
        from: (targets, durationOrVars, vars) => makeTween(targets, durationOrVars, vars, "from"),
        set: (targets, vars = {}) => makeTween(targets, 0, vars, "set"),
        killTweensOf(targets) {
            for (const target of toArray(targets)) {
                const tweens = activeTweens.get(target);
                if (!tweens) continue;
                Array.from(tweens).forEach((tween) => tween.kill());
            }
        },
        getAllTweens() {
            return Array.from(allTweens);
        },
    };

    globalThis.TweenMax = tweenApi;
    globalThis.TweenLite = tweenApi;
    globalThis.gsap = {
        to: (targets, durationOrVars = {}, vars) => makeTween(targets, durationOrVars, vars, "to"),
        from: (targets, durationOrVars = {}, vars) => makeTween(targets, durationOrVars, vars, "from"),
        set: (targets, vars = {}) => makeTween(targets, 0, vars, "set"),
        killTweensOf: tweenApi.killTweensOf,
        registerPlugin() {},
    };

    globalThis.PixiPlugin = globalThis.PixiPlugin ?? { registerPIXI() {} };
    globalThis.ScrollToPlugin = globalThis.ScrollToPlugin ?? {};
    globalThis.SplitText = globalThis.SplitText ?? class SplitText {};

    for (const name of [
        "Power0",
        "Power1",
        "Power2",
        "Power3",
        "Power4",
        "Back",
        "Elastic",
        "Bounce",
        "Circ",
        "Expo",
        "Sine",
        "Linear",
    ]) {
        globalThis[name] = name === "Power0" || name === "Linear" ? ease : easeFamily;
    }
})();
