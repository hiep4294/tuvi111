#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, os, re, sqlite3, sys, unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "build" / "hiep-tuvi-stars-source-v3.json"
OUT_DIR = ROOT / "knowledge" / "db" / "v3"
DB = OUT_DIR / "hiep_tuvi_stars_v3.sqlite"
RUNTIME = ROOT / "knowledge" / "all-stars.js"
SCHOOL = "NAM_PHAI_TAM_HOP"
VERSION = "3.0.0"
PALACES = ["Mệnh","Phụ Mẫu","Phúc Đức","Điền Trạch","Quan Lộc","Nô Bộc","Thiên Di","Tật Ách","Tài Bạch","Tử Tức","Phu Thê","Huynh Đệ"]
MAIN = ["Tử Vi","Thiên Cơ","Thái Dương","Vũ Khúc","Thiên Đồng","Liêm Trinh","Thiên Phủ","Thái Âm","Tham Lang","Cự Môn","Thiên Tướng","Thiên Lương","Thất Sát","Phá Quân"]
FOUR_HOA = {"Hóa Lộc","Hóa Quyền","Hóa Khoa","Hóa Kỵ"}
BLOCKERS = {"Tuần","Triệt","Tuần Không","Triệt Không"}
PRESSURE = {"Kình Dương","Đà La","Hỏa Tinh","Linh Tinh","Địa Không","Địa Kiếp","Thiên Hình","Kiếp Sát","Phá Toái","Thiên Khốc","Thiên Hư","Tang Môn","Bạch Hổ","Tuế Phá","Tử Phù","Bệnh Phù","Đại Hao","Tiểu Hao","Phục Binh","Quan Phủ","Quan Phù"}
BRANCHES = ["Tý","Sửu","Dần","Mão","Thìn","Tỵ","Ngọ","Mùi","Thân","Dậu","Tuất","Hợi"]
PROFILE_FIELDS = ["native_meaning","positive_expression","shadow_expression","personality","appearance","career_tendencies","wealth_tendencies","relationship_tendencies","benefic_support","malefic_pressure","health_symbolism"]

TU_HOA = {
 "Giáp":("Liêm Trinh","Phá Quân","Vũ Khúc","Thái Dương"),
 "Ất":("Thiên Cơ","Thiên Lương","Tử Vi","Thái Âm"),
 "Bính":("Thiên Đồng","Thiên Cơ","Văn Xương","Liêm Trinh"),
 "Đinh":("Thái Âm","Thiên Đồng","Thiên Cơ","Cự Môn"),
 "Mậu":("Tham Lang","Thái Âm","Hữu Bật","Thiên Cơ"),
 "Kỷ":("Vũ Khúc","Tham Lang","Thiên Lương","Văn Khúc"),
 "Canh":("Thái Dương","Vũ Khúc","Thái Âm","Thiên Đồng"),
 "Tân":("Cự Môn","Thái Dương","Văn Khúc","Văn Xương"),
 "Nhâm":("Thiên Lương","Tử Vi","Tả Phù","Vũ Khúc"),
 "Quý":("Phá Quân","Cự Môn","Thái Âm","Tham Lang"),
}
TRANS = ["Hóa Lộc","Hóa Quyền","Hóa Khoa","Hóa Kỵ"]

COMBOS = [
 ("Tử Phủ Vũ Tướng",["Tử Vi","Thiên Phủ","Vũ Khúc","Thiên Tướng"]),
 ("Sát Phá Tham",["Thất Sát","Phá Quân","Tham Lang"]),
 ("Cơ Nguyệt Đồng Lương",["Thiên Cơ","Thái Âm","Thiên Đồng","Thiên Lương"]),
 ("Nhật Nguyệt",["Thái Dương","Thái Âm"]),("Cự Nhật",["Cự Môn","Thái Dương"]),
 ("Cơ Cự",["Thiên Cơ","Cự Môn"]),("Cơ Lương",["Thiên Cơ","Thiên Lương"]),
 ("Vũ Tham",["Vũ Khúc","Tham Lang"]),("Liêm Tham",["Liêm Trinh","Tham Lang"]),
 ("Liêm Sát",["Liêm Trinh","Thất Sát"]),("Lộc Mã",["Lộc Tồn","Thiên Mã"]),
 ("Khoa Quyền Lộc",["Hóa Khoa","Hóa Quyền","Hóa Lộc"]),("Xương Khúc",["Văn Xương","Văn Khúc"]),
 ("Khôi Việt",["Thiên Khôi","Thiên Việt"]),("Tả Hữu",["Tả Phù","Hữu Bật"]),
 ("Quang Quý",["Ân Quang","Thiên Quý"]),("Đào Hồng Hỷ",["Đào Hoa","Hồng Loan","Thiên Hỷ"]),
 ("Không Kiếp",["Địa Không","Địa Kiếp"]),("Kình Đà",["Kình Dương","Đà La"]),
 ("Hỏa Linh",["Hỏa Tinh","Linh Tinh"]),("Hình Kỵ",["Thiên Hình","Hóa Kỵ"]),
]
FUNCTIONAL_GROUPS = ["Chính tinh","Tứ Hóa","Trợ tinh","Tài tinh","Đào hoa","Sát áp lực","Vòng Thái Tuế","Vòng Tràng Sinh","Lưu tinh/thời vận","Tuần Triệt","Optional Shensha"]


def norm(v):
    s=unicodedata.normalize("NFD",str(v or "")); s="".join(c for c in s if unicodedata.category(c)!="Mn"); s=s.replace("đ","d").replace("Đ","D").lower(); return re.sub(r"[^a-z0-9]+"," ",s).strip()

def text(v):
    if v is None: return ""
    if isinstance(v,str): return v.strip()
    if isinstance(v,(int,float,bool)): return str(v)
    if isinstance(v,list): return "; ".join(text(x) for x in v if text(x))
    if isinstance(v,dict): return "; ".join(f"{k}: {text(x)}" for k,x in v.items() if text(x))
    return str(v)

def pick(d,*keys,default=""):
    for k in keys:
        if k in d and text(d[k]): return text(d[k])
    return default

def category(s):
    name=s["name"]
    raw=pick(s,"category","type","star_type").upper().replace(" ","_")
    if raw=="OPTIONAL_SHENSHA" or pick(s,"usage_scope").upper()=="OPTIONAL": return "OPTIONAL_SHENSHA"
    if name in MAIN: return "MAIN_STAR"
    if name in FOUR_HOA: return "TRANSFORMATION"
    if name in BLOCKERS: return "BLOCKER"
    if raw: return raw
    return "AUX_STAR"

def profile(s):
    name=s["name"]
    native=pick(s,"native_meaning","meaning","coreMeaning","core_meaning","description","summary",default=f"{name}: ý nghĩa cần đọc trong cấu trúc toàn lá số.")
    positive=pick(s,"positive_expression","positive","strengths","good","benefic",default=f"Mặt thuận của {name} chỉ nâng thành kết luận khi được cung, bộ sao và tam phương hỗ trợ.")
    shadow=pick(s,"shadow_expression","negative","weaknesses","bad","malefic",default=f"Mặt nghịch của {name} là tín hiệu cần kiểm tra, không phải verdict độc lập.")
    personality=pick(s,"personality","traits","character",default=native)
    appearance=pick(s,"appearance","body","shape","physique",default="Chỉ dùng quy chiếu hình thể truyền thống khi có nhiều dấu hiệu đồng thuận.")
    career=pick(s,"career_tendencies","career","work",default=f"Nghề nghiệp phải xét {name} cùng Mệnh–Quan–Tài và toàn tam phương.")
    wealth=pick(s,"wealth_tendencies","wealth","finance","money",default=f"Tài chính phải xét {name} cùng Tài–Quan–Mệnh, Lộc và vận.")
    relation=pick(s,"relationship_tendencies","relationship","love","marriage",default=f"Quan hệ phải xét {name} cùng Phu Thê, Phúc Đức và cung liên đới.")
    benefic=pick(s,"benefic_support","good_with","support",default="Ưu tiên kiểm tra Tả Hữu, Khôi Việt, Xương Khúc, Lộc–Quyền–Khoa và bộ sao đúng cấu trúc.")
    malefic=pick(s,"malefic_pressure","bad_with","pressure",default="Kiểm tra Kình Đà, Hỏa Linh, Không Kiếp, Hình Kỵ, Hao và vị trí chúng phá cấu trúc nào.")
    health=pick(s,"health_symbolism","health","body_correspondence",default="Quy chiếu cơ thể truyền thống chỉ mang tính biểu tượng; không dùng làm chẩn đoán y khoa.")
    return dict(native_meaning=native,positive_expression=positive,shadow_expression=shadow,personality=personality,appearance=appearance,career_tendencies=career,wealth_tendencies=wealth,relationship_tendencies=relation,benefic_support=benefic,malefic_pressure=malefic,health_symbolism=health)

def branch_map(s):
    for k in ["brightness","dignity","miếu_vượng","mieu_vuong","strength_by_branch","positionStrength"]:
        v=s.get(k)
        if isinstance(v,dict): return v
    return {}

def main():
    if not SRC.exists(): raise SystemExit(f"Missing {SRC}")
    stars=json.loads(SRC.read_text(encoding="utf-8"))
    # Stable Vietnamese-name dedupe.
    uniq={}
    for s in stars:
        name=text(s.get("name") or s.get("canonical_name") or s.get("starName"))
        if name: uniq[norm(name)]=dict(s,name=name)
    stars=sorted(uniq.values(), key=lambda x:norm(x["name"]))
    if len(stars) != 122:
        raise SystemExit(f"V3 catalog gate failed: expected 122 stars, extracted {len(stars)}")
    OUT_DIR.mkdir(parents=True,exist_ok=True)
    if DB.exists(): DB.unlink()
    con=sqlite3.connect(DB); con.execute("PRAGMA foreign_keys=ON")
    con.executescript('''
    create table meta(key text primary key,value text not null);
    create table stars(star_id integer primary key,canonical_name text unique not null,category text not null,subgroup text,yin_yang text,element text,priority_tier integer,native_meaning text);
    create table school_star_policy(star_id integer,school_id text,enabled integer not null,default_weight real,usage_scope text,primary key(star_id,school_id),foreign key(star_id) references stars(star_id));
    create table star_profiles(star_id integer,school_id text,positive_expression text,shadow_expression text,personality text,appearance text,career_tendencies text,wealth_tendencies text,relationship_tendencies text,benefic_support text,malefic_pressure text,health_symbolism text,interpretation_guardrail text,profile_kind text,specificity_level text,role_in_chart text,strong_when text,weak_when text,must_check text,combo_focus text,timing_behavior text,coverage_score real,evidence_score real,source_id text,source_level text,rule_confidence text,primary key(star_id,school_id),foreign key(star_id) references stars(star_id));
    create table star_profile_field_provenance(star_id integer,school_id text,field_name text,value_kind text,source_id text,source_level text,rule_confidence text,notes text,primary key(star_id,school_id,field_name),foreign key(star_id) references stars(star_id));
    create table palaces(palace_id integer primary key,name text unique not null);
    create table star_palace_templates(id integer primary key autoincrement,star_id integer,palace_id integer,school_id text,activation_focus text,positive_template text,risk_template text,required_checks text,template_basis text,rule_confidence text,foreign key(star_id) references stars(star_id),foreign key(palace_id) references palaces(palace_id));
    create table star_interaction_templates(id integer primary key autoincrement,star_id integer,school_id text,interaction_type text,effect_template text,required_checks text,guardrail text,source_id text,source_level text,rule_confidence text,foreign key(star_id) references stars(star_id));
    create table dignity_policy(star_id integer,school_id text,dignity_mode text,variant_id text,notes text,primary key(star_id,school_id),foreign key(star_id) references stars(star_id));
    create table brightness_rules(id integer primary key autoincrement,star_id integer,school text,branch text,brightness text,variant_id text,source_id text,source_level text,rule_confidence text,active integer default 1,foreign key(star_id) references stars(star_id));
    create table body_usage_policy(star_id integer,school_id text,usage_mode text,notes text,primary key(star_id,school_id),foreign key(star_id) references stars(star_id));
    create table tu_hoa_mappings(id integer primary key autoincrement,school text,heavenly_stem text,transformation text,carrier_star_id integer,variant_id text,source_id text,source_level text,rule_confidence text,active integer default 1,notes text,foreign key(carrier_star_id) references stars(star_id));
    create table star_groups(group_id integer primary key,name text unique not null,group_type text,core_function text,geometry_requirement text,source_level text,rule_confidence text);
    create table star_group_members(group_id integer,star_id integer,member_order integer,required integer default 1,primary key(group_id,star_id),foreign key(group_id) references star_groups(group_id),foreign key(star_id) references stars(star_id));
    create table group_rules(id integer primary key autoincrement,group_id integer,school_id text,strength_conditions text,weakening_conditions text,rescue_conditions text,breaking_conditions text,final_gate text,foreign key(group_id) references star_groups(group_id));
    create table validation(check_name text primary key,status text,detail text);
    ''')
    con.executemany("insert into palaces(palace_id,name) values(?,?)",list(enumerate(PALACES,1)))
    con.executemany("insert into meta(key,value) values(?,?)",[("version",VERSION),("school",SCHOOL),("brightness_variant","TAN_BIEN_VIET_NAM"),("tu_hoa_variant","NAM_PHAI_VIET_COMMON_V1")])
    id_by_name={}
    runtime=[]
    for sid,s in enumerate(stars,1):
        name=s["name"]; cat=category(s); p=profile(s); id_by_name[norm(name)]=sid
        yy=pick(s,"yin_yang","yinYang","am_duong"); elem=pick(s,"element","ngu_hanh","fiveElement")
        tier=int(float(s.get("priority_tier") or (1 if cat=="MAIN_STAR" else 2 if cat in {"TRANSFORMATION","BLOCKER"} or name in PRESSURE else 4)))
        enabled=0 if cat=="OPTIONAL_SHENSHA" or s.get("enabled") in (0,False) else 1
        weight=float(s.get("default_weight") or (1.0 if tier==1 else .85 if tier==2 else .65 if tier==3 else .4))
        con.execute("insert into stars values(?,?,?,?,?,?,?,?)",(sid,name,cat,pick(s,"subgroup","group"),yy,elem,tier,p["native_meaning"]))
        con.execute("insert into school_star_policy values(?,?,?,?,?)",(sid,SCHOOL,enabled,weight,"OPTIONAL" if not enabled else "DEFAULT"))
        con.execute("insert into star_profiles values(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",(sid,SCHOOL,p["positive_expression"],p["shadow_expression"],p["personality"],p["appearance"],p["career_tendencies"],p["wealth_tendencies"],p["relationship_tendencies"],p["benefic_support"],p["malefic_pressure"],p["health_symbolism"],"Không dùng một sao = một kết luận; bắt buộc xét cung, Ngũ Hành, bộ sao, tam phương, Tứ Hóa, Tuần/Triệt, Tràng Sinh, Mệnh–Thân và vận.","SOURCE_PLUS_COMPOSITIONAL","V3",pick(s,"role_in_chart",default=p["native_meaning"]),pick(s,"strong_when",default="Mạnh khi đúng cung/bộ và được cấu trúc lớn hỗ trợ."),pick(s,"weak_when",default="Yếu hoặc đổi nghĩa khi sai thế, bị phá hoặc bị Tứ Hóa/Tuần Triệt điều biến."),pick(s,"must_check",default="cung;tam phương;tứ hóa;tuần triệt;tràng sinh;mệnh thân;vận"),pick(s,"combo_focus",default="Đọc theo bộ sao, không cô lập."),pick(s,"timing_behavior",default="Nguyên cục là nền; đại hạn là bối cảnh; lưu niên là kích hoạt."),1.0,.75,"TUVI111_EXISTING_KNOWLEDGE","C","CONDITIONAL"))
        for fld in PROFILE_FIELDS:
            value=p[fld]
            con.execute("insert into star_profile_field_provenance values(?,?,?,?,?,?,?,?)",(sid,SCHOOL,fld,"SOURCE" if pick(s,fld) else "COMPOSITIONAL","TUVI111_EXISTING_KNOWLEDGE","C","CONDITIONAL","Coverage không đồng nghĩa độ chắc chắn."))
        body_mode="SYMBOLIC_ONLY" if p["health_symbolism"] else "DO_NOT_USE"
        con.execute("insert into body_usage_policy values(?,?,?,?)",(sid,SCHOOL,body_mode,"Không dùng làm chẩn đoán, nguyên nhân bệnh, xác suất bệnh hay tuổi thọ."))
        bmap=branch_map(s); dignity_mode="EXPLICIT_12_BRANCH" if name in MAIN and len(bmap)>=10 else "SOURCE_REQUIRED"
        con.execute("insert into dignity_policy values(?,?,?,?,?)",(sid,SCHOOL,dignity_mode,"TAN_BIEN_VIET_NAM" if name in MAIN else "NONE","Không tự phát minh miếu/vượng cho phụ tinh."))
        if name in MAIN and bmap:
            bynorm={norm(k):text(v) for k,v in bmap.items()}
            for br in BRANCHES:
                val=bynorm.get(norm(br))
                if val: con.execute("insert into brightness_rules(star_id,school,branch,brightness,variant_id,source_id,source_level,rule_confidence,active) values(?,?,?,?,?,?,?,?,1)",(sid,SCHOOL,br,val,"TAN_BIEN_VIET_NAM","TUVI111_EXISTING_KNOWLEDGE","C","CONDITIONAL"))
        for pid,pal in enumerate(PALACES,1):
            con.execute("insert into star_palace_templates(star_id,palace_id,school_id,activation_focus,positive_template,risk_template,required_checks,template_basis,rule_confidence) values(?,?,?,?,?,?,?,?,?)",(sid,pid,SCHOOL,f"{name} kích hoạt chủ đề {pal}.",f"Mặt thuận của {name} tại {pal} chỉ giữ khi toàn cấu trúc hỗ trợ.",f"Mặt nghịch của {name} tại {pal} chỉ là giả thuyết cần kiểm tra.","tam phương;đối cung;tứ hóa;tuần triệt;tràng sinh;mệnh thân;vận","COMPOSITIONAL_NOT_VERDICT","CONDITIONAL"))
        for typ,effect in [("BENEFIC_SUPPORT",p["benefic_support"]),("MALEFIC_PRESSURE",p["malefic_pressure"]),("TU_HOA","Tứ Hóa phải đọc nguồn Hóa → sao mang Hóa → cung → cấu trúc bị tác động."),("GEOMETRY","Đọc đồng cung, tam hợp và đối cung theo Nam Phái/Tam Hợp trước khi chốt.")]:
            con.execute("insert into star_interaction_templates(star_id,school_id,interaction_type,effect_template,required_checks,guardrail,source_id,source_level,rule_confidence) values(?,?,?,?,?,?,?,?,?)",(sid,SCHOOL,typ,effect,"bản cung;tam phương;tứ hóa;tuần triệt","Không cộng/trừ điểm cơ học.","V3_COMPOSITIONAL","C","CONDITIONAL"))
        runtime.append(dict(db_star_id=sid,name=name,category=cat,subgroup=pick(s,"subgroup","group"),yin_yang=yy,element=elem,priority_tier=tier,native_meaning=p["native_meaning"],positive_expression=p["positive_expression"],shadow_expression=p["shadow_expression"],personality=p["personality"],appearance=p["appearance"],career_tendencies=p["career_tendencies"],wealth_tendencies=p["wealth_tendencies"],relationship_tendencies=p["relationship_tendencies"],benefic_support=p["benefic_support"],malefic_pressure=p["malefic_pressure"],health_symbolism=p["health_symbolism"],enabled=enabled,default_weight=weight,school=SCHOOL,rule_confidence="CONDITIONAL"))
    for stem, carriers in TU_HOA.items():
        for trans,name in zip(TRANS,carriers):
            sid=id_by_name.get(norm(name))
            if not sid: raise SystemExit(f"Missing Tứ Hóa carrier: {name}")
            confidence="DISPUTED" if stem in {"Mậu","Canh","Tân","Nhâm"} else "CONDITIONAL"
            con.execute("insert into tu_hoa_mappings(school,heavenly_stem,transformation,carrier_star_id,variant_id,source_id,source_level,rule_confidence,active,notes) values(?,?,?,?,?,?,?,?,1,?)",(SCHOOL,stem,trans,sid,"NAM_PHAI_VIET_COMMON_V1","V3_NAM_PHAI_BASELINE","C",confidence,"Dị bản trường phái phải giữ riêng; không hòa trộn."))
    groups=[]
    for name,members in COMBOS: groups.append((name,"COMBO",members))
    for name in FUNCTIONAL_GROUPS: groups.append((name,"FUNCTIONAL",[]))
    for gid,(gname,gtype,members) in enumerate(groups,1):
        con.execute("insert into star_groups values(?,?,?,?,?,?,?)",(gid,gname,gtype,"Cấu trúc chức năng; không dùng như verdict độc lập.","Kiểm tra đồng cung/tam hợp/xung/giáp/nhị hợp theo rule cụ thể.","C","CONDITIONAL"))
        for order,m in enumerate(members,1):
            sid=id_by_name.get(norm(m))
            if sid: con.execute("insert into star_group_members values(?,?,?,1)",(gid,sid,order))
        con.execute("insert into group_rules(group_id,school_id,strength_conditions,weakening_conditions,rescue_conditions,breaking_conditions,final_gate) values(?,?,?,?,?,?,?)",(gid,SCHOOL,"Đủ thành viên và đúng hình học.","Thiếu thành viên/sai thế/không hội đủ lực.","Cát tinh/Tứ Hóa hỗ trợ đúng nút.","Sát phá mạnh, Tuần/Triệt hoặc Tứ Hóa phá điều kiện lõi.","COMPLETE/PARTIAL/BROKEN"))
    # Functional memberships.
    func_id={name:22+i for i,name in enumerate(FUNCTIONAL_GROUPS)}
    for sid,s in enumerate(stars,1):
        name=s["name"]; cat=category(s); targets=[]
        if cat=="MAIN_STAR": targets.append("Chính tinh")
        if cat=="TRANSFORMATION": targets.append("Tứ Hóa")
        if cat=="BLOCKER": targets.append("Tuần Triệt")
        if cat=="OPTIONAL_SHENSHA": targets.append("Optional Shensha")
        if name in PRESSURE: targets.append("Sát áp lực")
        if name in {"Lộc Tồn","Hóa Lộc","Vũ Khúc","Thiên Phủ"}: targets.append("Tài tinh")
        if name in {"Đào Hoa","Hồng Loan","Thiên Hỷ","Thiên Riêu","Hồng Diễm"}: targets.append("Đào hoa")
        if not targets: targets.append("Trợ tinh")
        for t in targets:
            con.execute("insert or ignore into star_group_members values(?,?,99,0)",(func_id[t],sid))
    con.executescript('''
      create view v_active_nam_phai_stars as select s.*,p.default_weight,p.usage_scope from stars s join school_star_policy p on p.star_id=s.star_id where p.school_id='NAM_PHAI_TAM_HOP' and p.enabled=1;
      create view v_star_full_profile as select s.*,p.*,sp.positive_expression,sp.shadow_expression,sp.personality,sp.appearance,sp.career_tendencies,sp.wealth_tendencies,sp.relationship_tendencies,sp.health_symbolism from stars s join school_star_policy p on p.star_id=s.star_id and p.school_id='NAM_PHAI_TAM_HOP' join star_profiles sp on sp.star_id=s.star_id and sp.school_id='NAM_PHAI_TAM_HOP';
    ''')
    counts={
      "stars":con.execute("select count(*) from stars").fetchone()[0],
      "active":con.execute("select count(*) from school_star_policy where school_id=? and enabled=1",(SCHOOL,)).fetchone()[0],
      "profiles":con.execute("select count(*) from star_profiles where school_id=?",(SCHOOL,)).fetchone()[0],
      "field_provenance":con.execute("select count(*) from star_profile_field_provenance where school_id=?",(SCHOOL,)).fetchone()[0],
      "palace_templates":con.execute("select count(*) from star_palace_templates where school_id=?",(SCHOOL,)).fetchone()[0],
      "interactions":con.execute("select count(*) from star_interaction_templates where school_id=?",(SCHOOL,)).fetchone()[0],
      "groups":con.execute("select count(*) from star_groups").fetchone()[0],
      "tu_hoa":con.execute("select count(*) from tu_hoa_mappings where school=?",(SCHOOL,)).fetchone()[0],
      "brightness":con.execute("select count(*) from brightness_rules where school=?",(SCHOOL,)).fetchone()[0],
    }
    checks=[("stars_122",counts["stars"]==122,str(counts["stars"])),("profiles_122",counts["profiles"]==122,str(counts["profiles"])),("provenance_1342",counts["field_provenance"]==1342,str(counts["field_provenance"])),("palace_1464",counts["palace_templates"]==1464,str(counts["palace_templates"])),("interactions_488",counts["interactions"]==488,str(counts["interactions"])),("groups_32",counts["groups"]==32,str(counts["groups"])),("tu_hoa_40",counts["tu_hoa"]==40,str(counts["tu_hoa"]))]
    for n,ok,detail in checks: con.execute("insert into validation values(?,?,?)",(n,"PASS" if ok else "FAIL",detail))
    con.commit(); integrity=con.execute("pragma integrity_check").fetchone()[0]; con.close()
    if integrity!="ok" or any(not ok for _,ok,_ in checks): raise SystemExit(f"Validation failed: integrity={integrity}, counts={counts}")
    sha=hashlib.sha256(DB.read_bytes()).hexdigest()
    meta={"version":VERSION,"school":SCHOOL,"brightness_variant":"TAN_BIEN_VIET_NAM","tu_hoa_variant":"NAM_PHAI_VIET_COMMON_V1","counts":counts,"sqlite_sha256":sha,"guardrails":["Không dùng một sao = một kết luận.","Không tự phát minh miếu/vượng phụ tinh.","Bệnh tượng chỉ là quy chiếu truyền thống, không phải chẩn đoán y khoa.","Rule compositional không được xuất như verdict."]}
    overlay=json.dumps(runtime,ensure_ascii=False,separators=(",",":"))
    runtime_js='''"use strict";\n(function(root){const kb=root.HiepTuViKBData||(root.HiepTuViKBData={});const prior=[...(Array.isArray(kb.stars)?kb.stars:[]),...(Array.isArray(kb.minorStars)?kb.minorStars:[])];const V3=%s;const META=%s;const n=v=>String(v||"").normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").replace(/đ/g,"d").replace(/Đ/g,"D").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();const old=new Map(prior.map(x=>[n(x&&x.name),x]));kb.stars=Object.freeze(V3.map(x=>Object.freeze(Object.assign({},old.get(n(x.name))||{},x,{id:(old.get(n(x.name))||{}).id||`STAR-V3-${String(x.db_star_id).padStart(3,"0")}`}))));kb.starProfilesV3=kb.stars;kb.dbV3=Object.freeze(META);kb.lookupStarV3=name=>kb.stars.find(x=>n(x&&x.name)===n(name))||null;kb.starPalaceTemplateV3=(name,palace)=>{const s=kb.lookupStarV3(name);if(!s)return null;return {star:s.name,palace,school:META.school,activation_focus:`${s.name} kích hoạt chủ đề ${palace}.`,guardrail:"Template chỉ là compositional; phải xét tam phương, Tứ Hóa, Tuần/Triệt, Tràng Sinh, Mệnh–Thân và vận."};};})(typeof globalThis!=="undefined"?globalThis:this);\n'''%(overlay,json.dumps(meta,ensure_ascii=False,separators=(",",":")))
    RUNTIME.write_text(runtime_js,encoding="utf-8")
    (OUT_DIR/"manifest.json").write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding="utf-8")
    (OUT_DIR/"README.md").write_text(f"# Hiep TuVi Star DB V3\n\nSchool mặc định: `{SCHOOL}`. SQLite là nguồn dữ liệu có cấu trúc; `knowledge/all-stars.js` là runtime browser tương thích ngược.\n\n- Stars: {counts['stars']}\n- Profiles: {counts['profiles']}\n- Star×palace: {counts['palace_templates']}\n- Interactions: {counts['interactions']}\n- Groups: {counts['groups']}\n- Tứ Hóa: {counts['tu_hoa']}\n- Brightness rows imported from existing source: {counts['brightness']}\n- SQLite SHA-256: `{sha}`\n\nHealth/body fields are traditional symbolic correspondences only, never medical diagnosis.\n",encoding="utf-8")
    (OUT_DIR/"VALIDATION_REPORT.md").write_text("# V3 Validation\n\n"+"\n".join(f"- {'PASS' if ok else 'FAIL'} — {name}: {detail}" for name,ok,detail in checks)+f"\n- PASS — SQLite integrity: {integrity}\n- INFO — active default: {counts['active']}\n- INFO — brightness rows: {counts['brightness']}\n",encoding="utf-8")
    print(json.dumps({"status":"PASS","sha256":sha,"counts":counts},ensure_ascii=False))

if __name__=="__main__": main()
