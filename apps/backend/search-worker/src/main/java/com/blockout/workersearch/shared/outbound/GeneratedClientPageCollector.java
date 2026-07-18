package com.blockout.workersearch.shared.outbound;

import com.blockout.shared.model.PageInfo;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;
import java.util.function.IntFunction;

public final class GeneratedClientPageCollector {

    private GeneratedClientPageCollector() {
    }

    public static <P, I, S> List<S> collect(
            IntFunction<P> pageReader,
            Function<P, List<I>> itemsReader,
            Function<P, PageInfo> pageInfoReader,
            Function<I, S> snapshotMapper) {
        List<S> snapshots = new ArrayList<>();
        int pageNumber = 0;
        boolean hasNext;
        do {
            P page = pageReader.apply(pageNumber);
            if (page == null) {
                return List.copyOf(snapshots);
            }
            List<I> items = itemsReader.apply(page);
            if (items != null) {
                items.stream().map(snapshotMapper).forEach(snapshots::add);
            }
            PageInfo pageInfo = pageInfoReader.apply(page);
            hasNext = pageInfo != null && Boolean.TRUE.equals(pageInfo.getHasNext());
            pageNumber++;
        } while (hasNext);
        return List.copyOf(snapshots);
    }
}
