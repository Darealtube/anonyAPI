import { Cursorify } from "./cursorify";

type RelayPaginate = {
  pageInfo: {
    endCursor: string | null;
    hasNextPage: boolean;
  };
  edges: {
    node: any;
  }[];
};

type RelayPaginateProps = {
  finalArray: any[];
  cursorIdentifier: string;
  limit: number;
};

const relayPaginate = ({
  finalArray,
  cursorIdentifier,
  limit,
}: RelayPaginateProps): RelayPaginate => {
  return {
    pageInfo: {
      endCursor:
        finalArray.length > 0
          ? Cursorify(finalArray[finalArray.length - 1][cursorIdentifier])
          : null,
      hasNextPage: finalArray.length < limit ? false : true,
    },
    edges: finalArray.map((a) => ({ node: a })),
  };
};

export default relayPaginate;
