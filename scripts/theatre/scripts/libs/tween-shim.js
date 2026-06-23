(function () {
    if (globalThis.TweenMax && globalThis.gsap) return;

    const activeTweens = new WeakMap();
    const noopEase = (t) => t;
    const ease = {
        easeNone: noopEase,
        easeOut: noopEase,
        easeIn: noopEase,
        easeInOut: noopEase,
        none: noopEase,
    };
    const easeFamily = {easeOut: noopEase, easeIn: noopEase, easeInOut: noopEase};

    const toArray = (targets) => {
        if (!targets) return [];
        if (targets instanceof NodeList || targets instanceof HTMLCollection) return Array.from(targets);
        if (Array.isArray(targets)) return targets;
        if (typeof targets.length === "number" && !targets.nodeType && !targets.texture && typeof targets !== "string") {
            return Array.from(targets);
        }
        return [targets];
    };

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

    const isElement = (target) => globalThis.Element && target instanceof Element;

    const setPixiValue = (target, key, value) => {
        if (key === "scaleX" && target.scale) target.scale.x = value;
        else if (key === "scaleY" && target.scale) target.scale.y = value;
        else if (key === "rotation") target.rotation = Math.abs(Number(value)) > Math.PI * 2 ? Number(value) * (Math.PI / 180) : Number(value);
        else target[key] = value;
    };

    const getPixiValue = (target, key) => {
        if (key === "scaleX" && target.scale) return target.scale.x;
        if (key === "scaleY" && target.scale) return target.scale.y;
        return target[key];
    };

    const appendTransform = (target, transform) => {
        target.style.transform = `${target.style.transform || ""} ${transform}`.trim();
    };

    const setDomValue = (target, key, value) => {
        if (!target?.style) {
            target[key] = value;
            return;
        }
        if (key === "scale") appendTransform(target, `scale(${value})`);
        else if (key === "scaleX") appendTransform(target, `scaleX(${value})`);
        else if (key === "scaleY") appendTransform(target, `scaleY(${value})`);
        else if (key === "rotation" || key === "rotate") appendTransform(target, `rotate(${value}deg)`);
        else if (key === "x") appendTransform(target, `translateX(${typeof value === "number" ? `${value}px` : value})`);
        else if (key === "y") appendTransform(target, `translateY(${typeof value === "number" ? `${value}px` : value})`);
        else if (key === "autoAlpha") target.style.opacity = String(value);
        else if (key in target.style) target.style[key] = typeof value === "number" && key !== "opacity" && key !== "zIndex" ? `${value}px` : String(value);
        else target[key] = value;
    };

    const getDomValue = (target, key) => {
        if (!target?.style) return target[key];
        if (["scale", "scaleX", "scaleY", "rotation", "rotate", "x", "y"].includes(key)) return target.style.transform;
        if (key === "autoAlpha") return target.style.opacity;
        if (key in target.style) return target.style[key];
        return target[key];
    };

    const setValue = (target, key, value) => {
        if (isElement(target)) setDomValue(target, key, value);
        else setPixiValue(target, key, value);
    };

    const getValue = (target, key) => isElement(target) ? getDomValue(target, key) : getPixiValue(target, key);

    const applyVars = (target, vars) => {
        if (!target || !vars) return;
        if (vars.pixi) {
            for (const [key, value] of Object.entries(vars.pixi)) setPixiValue(target, key, value);
        }
        if (vars.scrollTo) {
            if (typeof vars.scrollTo.x === "number") target.scrollLeft = Math.max(0, vars.scrollTo.x - (vars.scrollTo.offsetX ?? 0));
            if (typeof vars.scrollTo.y === "number") target.scrollTop = Math.max(0, vars.scrollTo.y - (vars.scrollTo.offsetY ?? 0));
        }

        const ignored = new Set([
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
        ]);
        for (const [key, value] of Object.entries(vars)) {
            if (ignored.has(key)) continue;
            setValue(target, key, value);
        }
    };

    const captureVars = (target, vars) => {
        const captured = {};
        if (vars?.pixi) {
            captured.pixi = {};
            for (const key of Object.keys(vars.pixi)) captured.pixi[key] = getPixiValue(target, key);
        }
        for (const key of Object.keys(vars ?? {})) {
            if (["pixi", "scrollTo", "ease", "delay", "duration", "repeat", "repeatDelay", "stagger", "yoyo", "yoyoEase", "overwrite", "paused", "onComplete", "onCompleteParams"].includes(key)) continue;
            captured[key] = getValue(target, key);
        }
        return captured;
    };

    const restoreVars = (target, captured) => {
        if (captured?.pixi) {
            for (const [key, value] of Object.entries(captured.pixi)) setPixiValue(target, key, value);
        }
        for (const [key, value] of Object.entries(captured ?? {})) {
            if (key === "pixi") continue;
            setValue(target, key, value);
        }
    };

    const makeTween = (targets, durationOrVars, varsMaybe, mode = "to") => {
        const list = toArray(targets);
        const vars = typeof durationOrVars === "object" ? durationOrVars ?? {} : varsMaybe ?? {};
        const duration = typeof durationOrVars === "object" ? Number(vars.duration ?? 0) : Number(durationOrVars ?? vars.duration ?? 0);
        const delay = Number(vars.delay ?? 0) * 1000;
        const runtime = Math.max(0, duration * 1000);
        let killed = false;
        let startTimer;
        let completeTimer;

        const tween = {
            kill() {
                killed = true;
                clearTimeout(startTimer);
                clearTimeout(completeTimer);
                list.forEach((target) => forget(target, tween));
            },
            targets() {
                return list;
            },
            pause() {
                return tween;
            },
            play() {
                return tween;
            },
        };

        list.forEach((target) => remember(target, tween));

        startTimer = setTimeout(() => {
            if (killed) return;
            if (mode === "from") {
                const captured = list.map((target) => [target, captureVars(target, vars)]);
                list.forEach((target) => applyVars(target, vars));
                requestAnimationFrame(() => captured.forEach(([target, snapshot]) => restoreVars(target, snapshot)));
            } else {
                list.forEach((target) => applyVars(target, vars));
            }

            if (Number(vars.repeat ?? 0) === -1) return;
            completeTimer = setTimeout(() => {
                if (killed) return;
                if (typeof vars.stagger?.onComplete === "function") {
                    for (const target of list) {
                        vars.stagger.onComplete.call({targets: () => [target]});
                    }
                }
                if (typeof vars.onComplete === "function") vars.onComplete.apply(tween, vars.onCompleteParams ?? []);
                list.forEach((target) => forget(target, tween));
            }, runtime);
        }, delay);

        return tween;
    };

    const tweenApi = {
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
            return [];
        },
    };

    globalThis.TweenMax = globalThis.TweenMax ?? tweenApi;
    globalThis.TweenLite = globalThis.TweenLite ?? globalThis.TweenMax;
    globalThis.gsap = globalThis.gsap ?? {
        to: (targets, durationOrVars = {}, vars) => makeTween(targets, durationOrVars, vars, "to"),
        from: (targets, durationOrVars = {}, vars) => makeTween(targets, durationOrVars, vars, "from"),
        set: (targets, vars = {}) => makeTween(targets, 0, vars, "set"),
        killTweensOf: globalThis.TweenMax.killTweensOf,
        registerPlugin() {},
    };

    globalThis.PixiPlugin = globalThis.PixiPlugin ?? {registerPIXI() {}};
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
        globalThis[name] = globalThis[name] ?? (name === "Power0" || name === "Linear" ? ease : easeFamily);
    }
})();
