#pragma once
#include <cstdint>
#include <cstring>
#include <vector>
#include <algorithm>

struct Move32 {
    uint32_t data = 0;

    static Move32 make(int from, int to, int promo = -1, bool capture = false) {
        Move32 m;
        int p = (promo == -1) ? 0 : (promo + 1); // 0=none,1=Q,2=R,3=B,4=N
        m.data = (uint32_t)from
               | ((uint32_t)to    << 6)
               | ((uint32_t)p     << 12)
               | ((uint32_t)(capture ? 1 : 0) << 15);
        return m;
    }

    int from()    const { return (int)(data & 0x3F); }
    int to()      const { return (int)((data >> 6) & 0x3F); }
    int promo()   const {
        int p = (int)((data >> 12) & 0x7);
        return (p == 0) ? -1 : (p - 1);
    }
    bool isCapture() const { return (data >> 15) & 1; }
    bool isNull() const { return data == 0; }

    bool operator==(const Move32& o) const { return data == o.data; }
};

enum TTFlag : uint8_t {
    TT_EXACT = 0,
    TT_LOWER = 1,
    TT_UPPER = 2
};

struct TTEntry {
    uint64_t key   = 0;
    int32_t  score = 0;
    Move32   move  = {};
    int8_t   depth = 0;
    TTFlag   flag  = TT_EXACT;
    uint8_t  pad[1] = {};
};

class TranspositionTable {
public:
    explicit TranspositionTable(size_t sizeMB = 32) {
        size_t bytes   = sizeMB * 1024ULL * 1024ULL;
        size_t entries = bytes / sizeof(TTEntry);
        mask_ = 1;
        while (mask_ * 2 <= entries) mask_ *= 2;
        mask_ -= 1;
        table_.assign(mask_ + 1, TTEntry{});
    }

    void clear() {
        std::fill(table_.begin(), table_.end(), TTEntry{});
    }

    void store(uint64_t key, int score, Move32 move, int depth, TTFlag flag) {
        TTEntry& e = table_[key & mask_];
        e.key   = key;
        e.score = score;
        e.move  = move;
        e.depth = (int8_t)depth;
        e.flag  = flag;
    }

    const TTEntry* probe(uint64_t key) const {
        const TTEntry& e = table_[key & mask_];
        return (e.key == key) ? &e : nullptr;
    }

private:
    std::vector<TTEntry> table_;
    size_t               mask_ = 0;
};
