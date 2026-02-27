package run.halo.editor;

import static org.springdoc.core.fn.builders.apiresponse.Builder.responseBuilder;

import lombok.RequiredArgsConstructor;
import org.springdoc.webflux.core.fn.SpringdocRouteBuilder;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.server.RouterFunction;
import org.springframework.web.reactive.function.server.ServerResponse;
import reactor.core.publisher.Mono;
import run.halo.app.core.extension.endpoint.CustomEndpoint;
import run.halo.app.extension.GroupVersion;
import run.halo.app.plugin.ReactiveSettingFetcher;

@Component
@RequiredArgsConstructor
public class HybridEditBlockEndpoint implements CustomEndpoint {

    private final ReactiveSettingFetcher settingFetcher;

    @Override
    public RouterFunction<ServerResponse> endpoint() {
        final var tag = groupVersion().toString() + "/config";
        return SpringdocRouteBuilder.route()
            .GET("config", this::getConfig, builder -> {
                builder.operationId("GetHybridEditBlockConfig")
                    .description("Get hybrid edit block config.")
                    .tag(tag)
                    .response(responseBuilder().implementation(HybridEditBlockSetting.class));
            })
            .build();
    }

    private Mono<ServerResponse> getConfig(org.springframework.web.reactive.function.server.ServerRequest request) {
        return settingFetcher.fetch(HybridEditBlockSetting.GROUP, HybridEditBlockSetting.class)
                .defaultIfEmpty(new HybridEditBlockSetting("all"))
                .flatMap(config -> ServerResponse.ok().bodyValue(config));
    }

    @Override
    public GroupVersion groupVersion() {
        return new GroupVersion("api.hybrid-edit-block.halo.run", "v1alpha1");
    }
}
