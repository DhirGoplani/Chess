#include "board.h"
#include "tt.h"
#include <vector>
#include <string>
#include <algorithm>
#include <climits>
#include <chrono>
#include <atomic>
using namespace std;

int evaluate(Board& board);

static TranspositionTable TT(32);

static chrono::steady_clock::time_point g_searchStart;
static int   g_timeLimitMs = 3000;
static bool  g_timesUp     = false;

static const int MAX_PLY = 64;
static Move32 g_killers[MAX_PLY][2];
static int g_history[2][64][64];

static void clearSearchTables() {
    g_timesUp = false;
    memset(g_killers, 0, sizeof(g_killers));
    memset(g_history, 0, sizeof(g_history));
}

static bool timeUp() {
    if (g_timesUp) return true;
    auto now     = chrono::steady_clock::now();
    int  elapsed = (int)chrono::duration_cast<chrono::milliseconds>(now - g_searchStart).count();
    if (elapsed >= g_timeLimitMs) { g_timesUp = true; return true; }
    return false;
}

static int popLSB(BB& b) {
    int idx = __builtin_ctzll(b);
    b &= b - 1;
    return idx;
}

static inline string idxToSq(int idx) {
    return string(1, 'a' + (idx % 8)) + to_string(idx / 8 + 1);
}

static inline int sqToIdx(const string& sq) {
    return (sq[0] - 'a') + (sq[1] - '1') * 8;
}

static const int MATERIAL_APPROX[6] = {100, 500, 320, 330, 900, 20000};

struct SMove {
    Move32 m;
    int    score = 0;
};

static vector<SMove> generateLegalMoves(Board& board, int colour, bool capturesOnly = false) {
    vector<SMove> moves;
    moves.reserve(48);

    for (int piece = 0; piece < 6; piece++) {
        BB pieceBB = board.pieces[colour][piece];
        while (pieceBB) {
            int    fromIdx = popLSB(pieceBB);
            string fromSq  = idxToSq(fromIdx);
            BB     targets = 0;

            switch (piece) {
                case Board::PAWN:
                    targets = (colour == Board::WHITE)
                                  ? board.WhitePawnMoves(fromSq)
                                  : board.BlackPawnMoves(fromSq);
                    break;
                case Board::KNIGHT: targets = board.KnightMoves(fromSq, colour); break;
                case Board::BISHOP: targets = board.BishopMoves(fromSq, colour); break;
                case Board::ROOK:   targets = board.RookMoves  (fromSq, colour); break;
                case Board::QUEEN:  targets = board.QueenMoves (fromSq, colour); break;
                case Board::KING: {
                    targets = board.KingMoves(fromSq, colour);
                    BB ap = 0;
                    for (int i = 0; i < 2; i++)
                        for (int j = 0; j < 6; j++)
                            ap |= board.pieces[i][j];
                    if (colour == Board::WHITE) {
                        if (board.castlingRights.WhiteKingSide
                            && !(ap & (StringToBB("f1") | StringToBB("g1")))) {
                            Move tmp = board.makeMove("e1", "f1");
                            bool safe = !board.isInCheck(Board::WHITE);
                            board.unmakeMove(tmp);
                            if (safe) targets |= StringToBB("g1");
                        }
                        if (board.castlingRights.WhiteQueenSide
                            && !(ap & (StringToBB("b1") | StringToBB("c1") | StringToBB("d1")))) {
                            Move tmp = board.makeMove("e1", "d1");
                            bool safe = !board.isInCheck(Board::WHITE);
                            board.unmakeMove(tmp);
                            if (safe) targets |= StringToBB("c1");
                        }
                    } else {
                        if (board.castlingRights.BlackKingSide
                            && !(ap & (StringToBB("f8") | StringToBB("g8")))) {
                            Move tmp = board.makeMove("e8", "f8");
                            bool safe = !board.isInCheck(Board::BLACK);
                            board.unmakeMove(tmp);
                            if (safe) targets |= StringToBB("g8");
                        }
                        if (board.castlingRights.BlackQueenSide
                            && !(ap & (StringToBB("b8") | StringToBB("c8") | StringToBB("d8")))) {
                            Move tmp = board.makeMove("e8", "d8");
                            bool safe = !board.isInCheck(Board::BLACK);
                            board.unmakeMove(tmp);
                            if (safe) targets |= StringToBB("c8");
                        }
                    }
                    break;
                }
            }

            int enemy = 1 - colour;
            while (targets) {
                int    toIdx  = popLSB(targets);
                string toSq   = idxToSq(toIdx);
                BB     toBB   = 1ULL << toIdx;

                bool isCapture = false;
                for (int p = 0; p < 6; p++)
                    if (board.pieces[enemy][p] & toBB) { isCapture = true; break; }

                if (capturesOnly && !isCapture && piece != Board::PAWN)
                    continue;

                bool isPromoRank = (piece == Board::PAWN)
                    && ((colour == Board::WHITE && toIdx / 8 == 7)
                     || (colour == Board::BLACK && toIdx / 8 == 0));

                if (isPromoRank) {
                    for (int promo : {Board::QUEEN, Board::ROOK, Board::BISHOP, Board::KNIGHT}) {
                        Move mv    = board.makeMove(fromSq, toSq, promo);
                        bool legal = !board.isInCheck(colour);
                        board.unmakeMove(mv);
                        if (legal) {
                            Move32 m32 = Move32::make(fromIdx, toIdx, promo, isCapture);
                            moves.push_back({m32, 0});
                        }
                    }
                } else {
                    if (capturesOnly && !isCapture) continue;

                    Move mv    = board.makeMove(fromSq, toSq);
                    bool legal = !board.isInCheck(colour);
                    board.unmakeMove(mv);
                    if (legal) {
                        Move32 m32 = Move32::make(fromIdx, toIdx, -1, isCapture);
                        moves.push_back({m32, 0});
                    }
                }
            }
        }
    }
    return moves;
}

static void scoreMoves(Board& board, vector<SMove>& moves, int colour, int ply, const Move32& ttMove) {
    int enemy = 1 - colour;
    for (auto& sm : moves) {
        int from = sm.m.from();
        int to   = sm.m.to();
        int promo = sm.m.promo();
        BB  toBB  = 1ULL << to;
        BB  fromBB = 1ULL << from;

        if (sm.m == ttMove) { sm.score = 1'000'000; continue; }

        int movingPiece   = -1;
        int capturedPiece = -1;
        for (int mp = 0; mp < 6; mp++)
            if (board.pieces[colour][mp] & fromBB) { movingPiece = mp; break; }
        for (int cp = 0; cp < 6; cp++)
            if (board.pieces[enemy][cp] & toBB) { capturedPiece = cp; break; }

        if (capturedPiece != -1 && movingPiece != -1) {
            int mvvlva = 10 * MATERIAL_APPROX[capturedPiece] - MATERIAL_APPROX[movingPiece];
            sm.score = 500'000 + mvvlva;
            continue;
        }

        if (promo == Board::QUEEN) { sm.score = 400'000; continue; }

        if (ply < MAX_PLY) {
            if (sm.m == g_killers[ply][0]) { sm.score = 300'000; continue; }
            if (sm.m == g_killers[ply][1]) { sm.score = 200'000; continue; }
        }

        sm.score = g_history[colour][from][to];
    }
    sort(moves.begin(), moves.end(), [](const SMove& a, const SMove& b) { return a.score > b.score; });
}

static void updateKiller(int ply, Move32 m) {
    if (ply >= MAX_PLY) return;
    if (!(m == g_killers[ply][0])) {
        g_killers[ply][1] = g_killers[ply][0];
        g_killers[ply][0] = m;
    }
}

static void updateHistory(int colour, Move32 m, int depth) {
    g_history[colour][m.from()][m.to()] += depth * depth;
    if (g_history[colour][m.from()][m.to()] > 100'000) {
        for (int f = 0; f < 64; f++)
            for (int t = 0; t < 64; t++)
                g_history[colour][f][t] /= 2;
    }
}

static int quiescence(Board& board, int alpha, int beta, int colour) {
    if (timeUp()) return evaluate(board);

    bool inCheck = board.isInCheck(colour);
    int standPat = evaluate(board);

    if (!inCheck) {
        if (colour == Board::WHITE) {
            if (standPat >= beta) return beta;
            alpha = max(alpha, standPat);
        } else {
            if (standPat <= alpha) return alpha;
            beta = min(beta, standPat);
        }
    }

    vector<SMove> moves = generateLegalMoves(board, colour, true);
    Move32 noTT;
    scoreMoves(board, moves, colour, MAX_PLY - 1, noTT);

    for (auto& sm : moves) {
        if (g_timesUp) return standPat;
        string fromSq = idxToSq(sm.m.from());
        string toSq   = idxToSq(sm.m.to());
        int    promo  = sm.m.promo();

        Move mv    = board.makeMove(fromSq, toSq, promo);
        int  score = quiescence(board, alpha, beta, 1 - colour);
        board.unmakeMove(mv);

        if (colour == Board::WHITE) {
            if (score >= beta) return beta;
            alpha = max(alpha, score);
        } else {
            if (score <= alpha) return alpha;
            beta = min(beta, score);
        }
    }

    return (colour == Board::WHITE) ? alpha : beta;
}

static uint64_t ZOBRIST_PIECES[2][6][64];
static uint64_t ZOBRIST_SIDE;
static bool g_zobristInitialized = false;

static void initZobrist() {
    if (g_zobristInitialized) return;
    uint64_t seed = 1070372ULL;
    auto rng = [&seed]() {
        seed ^= seed << 13;
        seed ^= seed >> 7;
        seed ^= seed << 17;
        return seed;
    };
    for (int c = 0; c < 2; c++) {
        for (int p = 0; p < 6; p++) {
            for (int sq = 0; sq < 64; sq++) {
                ZOBRIST_PIECES[c][p][sq] = rng();
            }
        }
    }
    ZOBRIST_SIDE = rng();
    g_zobristInitialized = true;
}

static uint64_t computeZobrist(Board& board, int sideToMove) {
    initZobrist();
    uint64_t key = 0;
    for (int c = 0; c < 2; c++) {
        for (int p = 0; p < 6; p++) {
            BB bb = board.pieces[c][p];
            while (bb) {
                int sq = __builtin_ctzll(bb);
                bb &= bb - 1;
                key ^= ZOBRIST_PIECES[c][p][sq];
            }
        }
    }
    if (sideToMove == Board::BLACK) key ^= ZOBRIST_SIDE;
    return key;
}

static int alphaBeta(Board& board, int depth, int alpha, int beta, int colour, int ply, uint64_t posKey) {
    if (timeUp()) return evaluate(board);

    Move32 ttMove{};
    const TTEntry* tte = TT.probe(posKey);
    if (tte && tte->depth >= depth) {
        int s = tte->score;
        if (tte->flag == TT_EXACT)               return s;
        if (tte->flag == TT_LOWER && s >= beta)  return s;
        if (tte->flag == TT_UPPER && s <= alpha) return s;
        ttMove = tte->move;
    } else if (tte) {
        ttMove = tte->move;
    }
    bool inCheck = board.isInCheck(colour);
    if (inCheck && ply < MAX_PLY - 1) depth++;

    // ── Leaf / qsearch ────────────────────────────────────────────────────────
    if (depth <= 0)
        return quiescence(board, alpha, beta, colour);

    vector<SMove> moves = generateLegalMoves(board, colour);
    scoreMoves(board, moves, colour, ply, ttMove);

    if (moves.empty()) {
        if (board.isInCheck(colour))
            return (colour == Board::WHITE) ? -100'000 + ply : 100'000 - ply;
        return 0;
    }

    int    origAlpha = alpha;
    Move32 bestMove{};
    int    bestScore = (colour == Board::WHITE) ? INT_MIN : INT_MAX;

    for (auto& sm : moves) {
        if (g_timesUp) return evaluate(board);
        string fromSq = idxToSq(sm.m.from());
        string toSq   = idxToSq(sm.m.to());
        int    promo  = sm.m.promo();

        Move mv    = board.makeMove(fromSq, toSq, promo);
        uint64_t childKey = computeZobrist(board, 1 - colour);
        int  score = alphaBeta(board, depth - 1, alpha, beta, 1 - colour, ply + 1, childKey);
        board.unmakeMove(mv);

        if (colour == Board::WHITE) {
            if (score > bestScore) { bestScore = score; bestMove = sm.m; }
            alpha = max(alpha, score);
            if (beta <= alpha) {
                if (!sm.m.isCapture()) {
                    updateKiller(ply, sm.m);
                    updateHistory(colour, sm.m, depth);
                }
                break;
            }
        } else {
            if (score < bestScore) { bestScore = score; bestMove = sm.m; }
            beta = min(beta, score);
            if (beta <= alpha) {
                if (!sm.m.isCapture()) {
                    updateKiller(ply, sm.m);
                    updateHistory(colour, sm.m, depth);
                }
                break;
            }
        }
    }

    if (!g_timesUp && !bestMove.isNull()) {
        TTFlag flag;
        if      (bestScore <= origAlpha) flag = TT_UPPER;
        else if (bestScore >= beta)      flag = TT_LOWER;
        else                             flag = TT_EXACT;
        TT.store(posKey, bestScore, bestMove, depth, flag);
    }

    return bestScore;
}

pair<string, string> getBestMove(Board& board, int colour, int depth, int& bestPromotion) {
    clearSearchTables();
    g_searchStart = chrono::steady_clock::now();

    vector<SMove> rootMoves = generateLegalMoves(board, colour);
    if (rootMoves.empty()) {
        bestPromotion = -1;
        return {"", ""};
    }

    uint64_t rootKey = computeZobrist(board, colour);

    string bestFrom, bestTo;
    bestPromotion = -1;

    for (int d = 1; d <= depth; d++) {
        auto now = chrono::steady_clock::now();
        int elapsed = (int)chrono::duration_cast<chrono::milliseconds>(now - g_searchStart).count();

        // Allow deep search to use up to 85% of time budget
        if (elapsed > g_timeLimitMs * 0.85) break;
        if (timeUp()) break;

        const TTEntry* tte = TT.probe(rootKey);
        Move32 ttMove = tte ? tte->move : Move32{};
        scoreMoves(board, rootMoves, colour, 0, ttMove);

        int    iterBestScore = (colour == Board::WHITE) ? INT_MIN : INT_MAX;
        string iterFrom, iterTo;
        int    iterPromo = -1;
        int    alpha = INT_MIN, beta = INT_MAX;

        for (auto& sm : rootMoves) {
            if (timeUp()) break;

            string fromSq = idxToSq(sm.m.from());
            string toSq   = idxToSq(sm.m.to());
            int    promo  = sm.m.promo();

            Move mv    = board.makeMove(fromSq, toSq, promo);
            uint64_t childKey = computeZobrist(board, 1 - colour);
            int  score = alphaBeta(board, d - 1, alpha, beta, 1 - colour, 1, childKey);
            board.unmakeMove(mv);

            bool better = (colour == Board::WHITE) ? score > iterBestScore
                                                   : score < iterBestScore;
            if (better) {
                iterBestScore = score;
                iterFrom      = fromSq;
                iterTo        = toSq;
                iterPromo     = promo;
                if (colour == Board::WHITE) alpha = max(alpha, score);
                else                        beta  = min(beta,  score);
            }
        }

        if (!g_timesUp || d == 1) {
            bestFrom      = iterFrom;
            bestTo        = iterTo;
            bestPromotion = iterPromo;

            if (!iterFrom.empty()) {
                Move32 bm = Move32::make(sqToIdx(iterFrom), sqToIdx(iterTo), iterPromo);
                TT.store(rootKey, iterBestScore, bm, d, TT_EXACT);
            }
        }
    }

    return {bestFrom, bestTo};
}

bool hasLegalMoves(Board& board, int colour) {
    vector<SMove> moves = generateLegalMoves(board, colour);
    return !moves.empty();
}

void setTimeLimitMs(int ms) {
    g_timeLimitMs = ms;
}
