import { GraphQLClient, gql } from "graphql-request";
import BigNumber from "bignumber.js";
import { SimpleAdapter } from "../../adapters/types";
import { CHAIN } from "../../helpers/chains";
import { getUniqStartOfTodayTimestamp } from "../../helpers/getUniSubgraphVolume";

interface VolumeData {
  volume: string;
  totalVolume: string;
}

const endpoints = {
  [CHAIN.ARBITRUM]:
    "https://subgraph.satsuma-prod.com/32fabd582674/zions-team--383161/elfi_stats/version/v0.0.1/api",
  [CHAIN.BASE]:
    "https://subgraph.satsuma-prod.com/0116b02fe157/zios-team--730474/elfi_stats_base/api",
};



const queryVolumes = gql`
  query volumes($startDate: Int!, $endDate: Int!) {
    volumes(
      where: { date_gte: $startDate, date_lt: $endDate }
      orderBy: "date"
      orderDirection: "desc"
    ) {
      volume
      totalVolume
    }
  }
`;

const fetch = async (timestamp: number, chain: string) => {
const client = new GraphQLClient(endpoints[chain]);
  const dayTimestamp = getUniqStartOfTodayTimestamp(new Date(timestamp * 1000));

  const res = await client.request(queryVolumes, {
    startDate: timestamp - 86400,
    endDate: timestamp,
  });

  const volumeList = res.volumes as VolumeData[];

  const decimals = "1000000000000000000"; // 10**18

  const dailyVolume = volumeList.reduce((acc, item) => {
    return new BigNumber(item.volume).div(decimals).toNumber() + acc;
  }, 0);

  let totalVolume: number = 0;
  if (volumeList.length > 0) {
    totalVolume = new BigNumber(volumeList[0].totalVolume)
      .div(decimals)
      .toNumber();
  } else {
    // fallback
    const res = await client.request(queryVolumes, {
      startDate: timestamp - 86400 * 10,
      endDate: timestamp,
    });
    const volumeList = res.volumes as VolumeData[];

    totalVolume = new BigNumber(volumeList[0].totalVolume)
      .div(decimals)
      .toNumber();
  }

  return {
    totalVolume,
    dailyVolume,
    timestamp: dayTimestamp,
  };
};

const adapter: SimpleAdapter = {
  adapter: {
    [CHAIN.ARBITRUM]: {
      fetch: (timeStamp: number) => {
        return fetch(timeStamp, CHAIN.ARBITRUM);
      },
      start: "2024-07-14",
    },
    [CHAIN.BASE]: {
      fetch: (timeStamp: number) => {
        return fetch(timeStamp, CHAIN.BASE);
      },
      start: "2025-02-27",
    },
  },
};

export default adapter;
