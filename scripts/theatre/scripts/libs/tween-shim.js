(function () {
    if (globalThis.TweenMax) return;

    const activeTweens = new WeakMap();
    const ease = {
        easeNone: (t) => t,
        easeOut: (t) => t,
        easeIn: (t) => t,
        easeInOut: (t) => t,
    };
    const easeFamily = {easeOut: ease.easeOut, easeIn: ease.easeIn, easeInOut: ease.easeInOut};

    const toArray = (targets) => {
        if (!targets) return [];
        if (typeof targets.length === "number" && !targets.nodeType && !targets.texture) return Array.from(targets);
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

    const setPixiValue = (target, key, value) => {
        if (key === "scaleX" && target.scale) target.scale.x = value;
        else if (key === "scaleY" && target.scale) target.scale.y = value;
        else if (key === "rotation") target.rotation = Number(value) * (Math.PI / 180);
        else target[key] = value;
    };

    const setDomValue = (target, key, value) => {
        if (key === "scale") {
            target.style.transform = `scale(${value})`;
        } else if (key === "rotation") {
            target.style.transform = `rotate(${value}deg)`;
        } else if (key in target.style) {
            target.style[key] = typeof value === "number" && key !== "opacity" ? `${value}px` : String(value);
        } else {
            target[key] = value;
        }
    };

    const applyVars = (target, vars) => {
        if (!target || !vars) return;
        if (vars.pixi) {
            for (const [key, value] of Object.entries(vars.pixi)) setPixiValue(target, key, value);
        }
        if (vars.scrollTo) {
            if (typeof vars.scrollTo.x === "number") target.scrollLeft = vars.scrollTo.x - (vars.scrollTo.offsetX ?? 0);
            if (typeof vars.scrollTo.y === "number") target.scrollTop = vars.scrollTo.y - (vars.scrollTo.offsetY ?? 0);
        }

        const ignored = new Set([
            "pixi",
            "scrollTo",
            "ease",
            "delay",
            "repeat",
            "repeatDelay",
            "yoyo",
            "yoyoEase",
            "onComplete",
            "onCompleteParams",
        ]);
        for (const [key, value] of Object.entries(vars)) {
            if (ignored.has(key)) continue;
            if (target instanceof Element) setDomValue(target, key, value);
            else target[key] = value;
        }
    };

    const makeTween = (targets, duration, vars, mode = "to") => {
        const list = toArray(targets);
        const delay = Number(vars?.delay ?? 0) * 1000;
        const runtime = Math.max(0, Number(duration ?? 0) * 1000);
        let killed = false;

        const tween = {
            kill() {
                killed = true;
                clearTimeout(timer);
                list.forEach((target) => forget(target, tween));
            },
            targets() {
                return list;
            },
        };
        list.forEach((target) => remember(target, tween));

        const timer = setTimeout(() => {
            if (killed) return;
            if (mode === "to" || mode === "set" || mode === "from") {
                list.forEach((target) => applyVars(target, vars));
            }

            if (Number(vars?.repeat ?? 0) === -1) return;
            if (typeof vars?.onComplete === "function") {
                vars.onComplete.apply(tween, vars.onCompleteParams ?? []);
            }
            list.forEach((target) => forget(target, tween));
        }, delay + runtime);

        return tween;
    };

    globalThis.TweenMax = {
        to: (targets, duration, vars = {}) => makeTween(targets, duration, vars, "to"),
        from: (targets, duration, vars = {}) => makeTween(targets, duration, vars, "from"),
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
    globalThis.TweenLite = globalThis.TweenMax;

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
