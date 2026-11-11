package ru.gryphon999.slovolov;

import android.app.Activity;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.yandex.mobile.ads.common.AdError;
import com.yandex.mobile.ads.common.AdRequest;
import com.yandex.mobile.ads.common.AdRequestError;
import com.yandex.mobile.ads.common.ImpressionData;
import com.yandex.mobile.ads.common.YandexAds;
import com.yandex.mobile.ads.interstitial.InterstitialAd;
import com.yandex.mobile.ads.interstitial.InterstitialAdEventListener;
import com.yandex.mobile.ads.interstitial.InterstitialAdLoadListener;
import com.yandex.mobile.ads.interstitial.InterstitialAdLoader;
import com.yandex.mobile.ads.rewarded.Reward;
import com.yandex.mobile.ads.rewarded.RewardedAd;
import com.yandex.mobile.ads.rewarded.RewardedAdEventListener;
import com.yandex.mobile.ads.rewarded.RewardedAdLoadListener;
import com.yandex.mobile.ads.rewarded.RewardedAdLoader;

/**
 * Yandex Mobile Ads for the game: one fullscreen ad and one rewarded video are kept loaded,
 * and the game asks to show them. Ad unit ids come from res/values/ads.xml.
 * JS: YandexAds.showInterstitial() -> {shown}, YandexAds.showRewarded() -> {shown, rewarded}.
 */
@CapacitorPlugin(name = "YandexAds")
public class YandexAdsPlugin extends Plugin {
    private InterstitialAdLoader interstitialLoader;
    private RewardedAdLoader rewardedLoader;
    private InterstitialAd interstitial;
    private RewardedAd rewarded;

    @Override
    public void load() {
        Activity activity = getActivity();
        YandexAds.initialize(activity, () -> {});
        interstitialLoader = new InterstitialAdLoader(activity);
        rewardedLoader = new RewardedAdLoader(activity);
        loadInterstitial();
        loadRewarded();
    }

    private String unit(String name) {
        int id = getContext().getResources().getIdentifier(name, "string", getContext().getPackageName());
        return getContext().getString(id);
    }

    private void loadInterstitial() {
        interstitialLoader.loadAd(new AdRequest.Builder(unit("yandex_interstitial_id")).build(), new InterstitialAdLoadListener() {
            @Override public void onAdLoaded(InterstitialAd ad) { interstitial = ad; }
            @Override public void onAdFailedToLoad(AdRequestError error) { interstitial = null; }
        });
    }

    private void loadRewarded() {
        rewardedLoader.loadAd(new AdRequest.Builder(unit("yandex_rewarded_id")).build(), new RewardedAdLoadListener() {
            @Override public void onAdLoaded(RewardedAd ad) { rewarded = ad; }
            @Override public void onAdFailedToLoad(AdRequestError error) { rewarded = null; }
        });
    }

    @PluginMethod
    public void showInterstitial(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            InterstitialAd ad = interstitial;
            if (ad == null) { loadInterstitial(); call.resolve(result(false, false)); return; }
            interstitial = null;
            ad.setAdEventListener(new InterstitialAdEventListener() {
                @Override public void onAdShown() {}
                @Override public void onAdFailedToShow(AdError error) { loadInterstitial(); call.resolve(result(false, false)); }
                @Override public void onAdDismissed() { loadInterstitial(); call.resolve(result(true, false)); }
                @Override public void onAdClicked() {}
                @Override public void onAdImpression(ImpressionData data) {}
            });
            ad.show(getActivity());
        });
    }

    @PluginMethod
    public void showRewarded(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            RewardedAd ad = rewarded;
            if (ad == null) { loadRewarded(); call.resolve(result(false, false)); return; }
            rewarded = null;
            final boolean[] earned = { false };
            ad.setAdEventListener(new RewardedAdEventListener() {
                @Override public void onAdShown() {}
                @Override public void onAdFailedToShow(AdError error) { loadRewarded(); call.resolve(result(false, false)); }
                @Override public void onAdDismissed() { loadRewarded(); call.resolve(result(true, earned[0])); }
                @Override public void onRewarded(Reward reward) { earned[0] = true; }
                @Override public void onAdClicked() {}
                @Override public void onAdImpression(ImpressionData data) {}
            });
            ad.show(getActivity());
        });
    }

    private static JSObject result(boolean shown, boolean rewarded) {
        JSObject r = new JSObject();
        r.put("shown", shown);
        r.put("rewarded", rewarded);
        return r;
    }
}
