import os
import math
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

router = APIRouter()

# Initialize connection client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")

supabase: Optional[Client] = None
if supabase_url and supabase_key:
    if "placeholder" not in supabase_url.lower() and "placeholder" not in supabase_key.lower():
        try:
            supabase = create_client(supabase_url, supabase_key)
        except Exception as e:
            print(f"Error initializing connection client: {e}")

class MatchRequest(BaseModel):
    blood_type: str = Field(..., description="Desired blood group (e.g. A+, O-, B+)")
    latitude: float
    longitude: float
    radius_km: Optional[float] = 10.0
    city: Optional[str] = None

class DonorMatch(BaseModel):
    donor_id: str
    name: str
    blood_type: str
    distance_km: float
    match_score: float
    phone: Optional[str] = None
    urgency_recommendation: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class EligibilityRequest(BaseModel):
    age: int
    weight_kg: float
    last_donation_months: int
    health_conditions: List[str]

class EligibilityResponse(BaseModel):
    eligible: bool
    reason: str
    next_eligible_date: Optional[str] = None

@router.post("/match", response_model=List[DonorMatch])
def match_donors(payload: MatchRequest):
    """
    Location-based matching for donors with a robust city fallback mechanism.
    """
    if not supabase:
        raise HTTPException(
            status_code=500, 
            detail="Connection configurations are not set or invalid. Please check your credentials."
        )

    try:
        # Fetch active donors matching requested blood group from database
        response = supabase.table("donors")\
            .select("*")\
            .eq("blood_group", payload.blood_type)\
            .eq("is_available", True)\
            .execute()

        matches = []
        for donor in response.data:
            # Check if city matches (case-insensitive) if city is provided
            city_matches = False
            if payload.city and donor.get("city") and payload.city.strip().lower() in donor["city"].strip().lower():
                city_matches = True
            
            has_coords = donor.get("latitude") is not None and donor.get("longitude") is not None

            # Skip if no coordinates AND city doesn't match
            if not has_coords and not city_matches:
                continue

            dist = 0.0
            if has_coords:
                # Calculate distance using basic Haversine formula
                lat1, lon1 = math.radians(payload.latitude), math.radians(payload.longitude)
                lat2, lon2 = math.radians(donor["latitude"]), math.radians(donor["longitude"])
                
                dlat = lat2 - lat1
                dlon = lon2 - lon1
                
                a = math.sin(dlat / 2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2)**2
                c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
                dist = 6371.0 * c # Earth radius in km

            if city_matches or (has_coords and dist <= payload.radius_km):
                # Calculate compatibility score (closer distance = higher score)
                if has_coords:
                    score = max(0.5, 1.0 - (dist / (payload.radius_km * 2)))
                    urgency = "Highly Recommended: Compatibility is high and close by." if score >= 0.8 else "Suitable Match."
                else:
                    score = 0.9  # High default score for exact city matches
                    urgency = "Recommended Match: Located in the requested city."

                matches.append(DonorMatch(
                    donor_id=str(donor["id"]),
                    name=donor["name"],
                    blood_type=donor["blood_group"],
                    distance_km=round(dist, 1),
                    match_score=round(score, 2),
                    phone=donor.get("phone"),
                    urgency_recommendation=urgency,
                    latitude=donor.get("latitude"),
                    longitude=donor.get("longitude")
                ))
        
        # Sort by match score descending
        matches.sort(key=lambda x: x.match_score, reverse=True)
        return matches

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")

@router.post("/health-eligibility", response_model=EligibilityResponse)
def check_eligibility(payload: EligibilityRequest):
    """
    Health eligibility evaluation based on standard medical criteria.
    """
    if payload.age < 18 or payload.age > 65:
        return EligibilityResponse(eligible=False, reason="Age must be between 18 and 65 years.")
    
    if payload.weight_kg < 50.0:
        return EligibilityResponse(eligible=False, reason="Weight must be at least 50 kg.")
    
    if payload.last_donation_months < 3:
        return EligibilityResponse(
            eligible=False, 
            reason="Minimum gap of 3 months required between donations.",
            next_eligible_date=f"In {3 - payload.last_donation_months} month(s)"
        )
        
    for condition in payload.health_conditions:
        lower_cond = condition.lower()
        if any(x in lower_cond for x in ["hiv", "hepatitis", "cancer", "diabetes insulin"]):
            return EligibilityResponse(eligible=False, reason=f"Ineligible due to health condition: {condition}")

    return EligibilityResponse(eligible=True, reason="Meets standard blood donation eligibility criteria.")
