import { Request, Response, NextFunction } from "express";
import { array } from "joi";
import MatchModels from "../Models/MatchModels";
import UserModels from "../Models/UserModels";
import { AppError, HTTPCODES } from "../Utils/AppError";
import AsyncHandler from "../Utils/AsyncHandler";

// ADMIN CREATE MATCHES && Allow an admin upload matches for the particular match week
export const CreateMatch = AsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { teamA, teamB, teamAScore, teamBScore, Odds, dateTime } = req.body;

    const user = await UserModels.findById(req.params.userID);

    if (user?.isAdmin) {
      const Match = await MatchModels.create({
        teamA,
        teamB,
        teamAScore: 0,
        teamBScore: 0,
        Odds,
        stopPlay: false,
        startPlay: false,
        scoreEntry: `${teamAScore} VS ${teamBScore}`,
        dateTime,
      });

      return res.status(HTTPCODES.OK).json({
        message: "Successfully created Match",
        data: Match,
      });
    } else {
      next(
        new AppError({
          message: "You are not authorized to create match",
          httpcode: HTTPCODES.BAD_REQUEST,
        })
      );
    }
  }
);

// ADMIN AND USERS VIEW ALL MATCHES:
export const viewAllMatch = AsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const Match = await MatchModels.find();

    if (!Match) {
      next(
        new AppError({
          message: "Couldn't get all Match",
          httpcode: HTTPCODES.BAD_REQUEST,
        })
      );
    }

    return res.status(HTTPCODES.OK).json({
      message: "All Matches successfully gotten",
      data: Match,
    });
  }
);

// Allow an admin automatically update the scores in real time
export const UpdateScoresOfMatches = AsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { teamAScore, teamBScore } = req.body;

    const GetAdmin = await UserModels.findById(req.params.userID);
    const CurrentMatch = await MatchModels.findById(req.params.matchID);

    if (GetAdmin?.isAdmin) {
      if (CurrentMatch && CurrentMatch.startPlay) {
        if (CurrentMatch?.stopPlay) {
          next(
            new AppError({
              message: "Match has ended",
              httpcode: HTTPCODES.BAD_REQUEST,
            })
          );
        } else {
          const Matchscores = await MatchModels.findByIdAndUpdate(
            req.params.matchID,
            {
              teamAScore,
              teamBScore,
              scoreEntry: `${teamAScore} VS ${teamBScore}`,
            },
            { new: true }
          );

          return res.status(HTTPCODES.OK).json({
            message: "Match scores has been updated successfully",
            data: Matchscores,
          });
        }
      } else {
        next(
          new AppError({
            message: "March has not started",
            httpcode: HTTPCODES.BAD_REQUEST,
          })
        );
      }
    } else {
      next(
        new AppError({
          message: "You are not an admin",
          httpcode: HTTPCODES.UNAUTHORIZED,
        })
      );
    }
  }
);

// Allow an admin start matches and for the matches to end automatically
export const UpdateStartMatch = AsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { teamAScore, teamBScore, startPlay } = req.body;

    const GetAdmin = await UserModels.findById(req.params.userID);

    if (GetAdmin?.isAdmin) {
      const Match = await MatchModels.findByIdAndUpdate(
        req.params.matchID,
        {
          startPlay: true,
        },
        { new: true }
      );

      //   to stop the match after 2 mins instead of the normal 90 mins:
      setTimeout(async () => {
        await MatchModels.findByIdAndUpdate(
          req.params.matchID,
          {
            stopPlay: true,
          },
          { new: true }
        );
      }, 120000);

      return res.status(HTTPCODES.OK).json({
        message: "Match has started",
        data: Match,
      });
    } else {
      next(
        new AppError({
          message: "You are not an admin, you can't start a match",
          httpcode: HTTPCODES.UNAUTHORIZED,
        })
      );
    }
  }
);
